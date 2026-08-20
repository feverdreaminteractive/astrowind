import React, { useMemo, useState } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'branded' | 'unbranded';
}

interface Source {
  title: string;
  url: string;
}

interface QuestionResult {
  questionId: string;
  question: string;
  type: 'branded' | 'unbranded';
  answerText: string;
  sources: Source[];
  error?: string;
}

interface SiteAudit {
  url: string;
  schema: { types: string[]; present: boolean };
  headings: { h1Count: number; h1Text: string | null; totalHeadings: number; skippedLevel: boolean };
  description: { metaDescription: string | null; firstParagraph: string | null };
  comparison: { hasFaqLink: boolean; hasComparisonLink: boolean };
  freshness: { httpLastModified: string | null; visibleDateFound: boolean; updatedLabelFound: boolean };
  llmsTxtPresent: boolean;
  robotsTxtPresent: boolean;
  aiCrawlerAccess: Record<string, string> | null;
}

interface Competitor {
  name: string;
  mentionCount: number;
}

interface SourceAttribution {
  domain: string;
  category: 'owned' | 'review' | 'competitor' | 'forum' | 'other';
  mentionCount: number;
}

interface Analysis {
  questionResults: { questionId: string; prominence: 'first' | 'listed' | 'absent' }[];
  competitors: Competitor[];
  characterization: string;
  factualErrors: string[];
  sourceAttribution: SourceAttribution[];
  gaps: string[];
  siteConnections: string[];
  recommendations: string[];
  visibility: { appearedIn: number; totalQuestions: number };
}

type Phase = 'input' | 'generating' | 'review' | 'running' | 'analyzing' | 'done' | 'error';

// Claude's web_search tool shows real latency degradation under concurrency
// on this account/tier (verified empirically — plain calls scale fine, but
// concurrent search calls don't); 2 balances speed against overloading it.
const CONCURRENCY = 2;

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(new Array(Math.min(limit, items.length)).fill(0).map(() => worker()));
  return results;
}

const PROMINENCE_LABEL: Record<string, string> = { first: 'First mention', listed: 'Listed', absent: 'Absent' };
const PROMINENCE_STYLE: Record<string, string> = {
  first: 'bg-green-500/15 text-green-400 border-green-500/30',
  listed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  absent: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
};

const CATEGORY_LABEL: Record<string, string> = {
  owned: 'Owned',
  review: 'Review site',
  competitor: 'Competitor',
  forum: 'Forum',
  other: 'Other',
};

function highlightBrand(text: string, company: string): React.ReactNode {
  if (!company.trim()) return text;
  const parts = text.split(new RegExp(`(${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === company.toLowerCase() ? (
      <mark key={i} className="bg-purple-500/30 text-purple-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function buildReportMarkdown(company: string, results: QuestionResult[], analysis: Analysis, siteAudit: SiteAudit | null): string {
  const lines: string[] = [];
  lines.push(`# AEO Visibility Report — ${company}`);
  lines.push(`_Single-run snapshot using Claude with web search. Other assistants (ChatGPT, Perplexity, Gemini) will differ, and re-running may vary._`);
  lines.push('');
  lines.push(`## Visibility Scorecard`);
  lines.push(`Appeared in ${analysis.visibility.appearedIn} of ${analysis.visibility.totalQuestions} answers.`);
  if (analysis.competitors.length) {
    lines.push('');
    lines.push('**Competitors named:**');
    lines.push(...analysis.competitors.map((c) => `- ${c.name} (${c.mentionCount})`));
  }
  lines.push('');
  lines.push('## Characterization');
  lines.push(analysis.characterization);
  lines.push('');
  lines.push('## Factual Errors');
  lines.push(...(analysis.factualErrors.length ? analysis.factualErrors.map((e) => `- ${e}`) : ['None flagged this run.']));
  lines.push('');
  lines.push('## Gaps');
  lines.push(...(analysis.gaps.length ? analysis.gaps.map((g) => `- ${g}`) : ['None identified.']));
  if (siteAudit && analysis.siteConnections.length) {
    lines.push('');
    lines.push('## Site ↔ Visibility Connections');
    lines.push(...analysis.siteConnections.map((s) => `- ${s}`));
  }
  lines.push('');
  lines.push('## Recommendations');
  lines.push(...analysis.recommendations.map((r, i) => `${i + 1}. ${r}`));
  lines.push('');
  lines.push('## Question-by-Question');
  for (const r of results) {
    const prom = analysis.questionResults.find((q) => q.questionId === r.questionId)?.prominence || 'unknown';
    lines.push(`### ${r.question}`);
    lines.push(`_${PROMINENCE_LABEL[prom] || prom}_`);
    lines.push(r.answerText);
    if (r.sources.length) {
      lines.push(`Sources: ${r.sources.map((s) => s.url).join(', ')}`);
    }
    lines.push('');
  }
  if (siteAudit) {
    lines.push('## Site Audit');
    lines.push(`- Schema.org: ${siteAudit.schema.present ? siteAudit.schema.types.join(', ') : 'none detected'}`);
    lines.push(`- Meta description: ${siteAudit.description.metaDescription || 'none found'}`);
    lines.push(`- llms.txt: ${siteAudit.llmsTxtPresent ? 'present' : 'not found'}`);
    if (siteAudit.aiCrawlerAccess) {
      lines.push(`- AI crawler access: ${Object.entries(siteAudit.aiCrawlerAccess).map(([b, v]) => `${b}: ${v}`).join(', ')}`);
    }
  }

  return lines.join('\n');
}

export default function AeoChecker() {
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Map<string, QuestionResult>>(new Map());
  const [siteAudit, setSiteAudit] = useState<SiteAudit | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  // Mirrors `results` synchronously so runCheck can read the definitive
  // latest value after concurrency resolves, without the setState-as-getter
  // pattern (which can double-fire side effects under StrictMode).
  const resultsRef = React.useRef<Map<string, QuestionResult>>(new Map());

  async function generateQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setError(null);
    setPhase('generating');
    try {
      const res = await fetch('/api/aeo-generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not generate questions.');
      setQuestions(body.questions);
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Could not generate questions.');
      setPhase('error');
    }
  }

  function updateQuestion(id: string, text: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, text } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  async function runCheck() {
    const live = questions.filter((q) => q.text.trim());
    if (live.length === 0) return;

    setError(null);
    resultsRef.current = new Map();
    setResults(new Map());
    setSiteAudit(null);
    setAnalysis(null);
    setCopied(false);
    setPhase('running');

    const sitePromise = url.trim()
      ? fetch('/api/aeo-site-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
          .then((r) => r.json())
          .then((body) => (body.error ? null : (setSiteAudit(body), body)))
          .catch(() => null)
      : Promise.resolve(null);

    await runWithConcurrency(live, CONCURRENCY, async (q) => {
      try {
        const res = await fetch('/api/aeo-run-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q.text, questionId: q.id }),
        });
        const body = await res.json();
        const result: QuestionResult = res.ok
          ? { questionId: q.id, question: q.text, type: q.type, answerText: body.answerText, sources: body.sources }
          : { questionId: q.id, question: q.text, type: q.type, answerText: '', sources: [], error: body.error };
        resultsRef.current = new Map(resultsRef.current).set(q.id, result);
        setResults(resultsRef.current);
      } catch {
        const result: QuestionResult = { questionId: q.id, question: q.text, type: q.type, answerText: '', sources: [], error: 'Request failed.' };
        resultsRef.current = new Map(resultsRef.current).set(q.id, result);
        setResults(resultsRef.current);
      }
    });

    const finalSiteAudit = await sitePromise;

    setPhase('analyzing');
    try {
      const list = live.map((q) => resultsRef.current.get(q.id)).filter((r): r is QuestionResult => !!r && !r.error);
      const res = await fetch('/api/aeo-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), results: list, siteAudit: finalSiteAudit }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not analyze results.');
      setAnalysis(body.analysis);
      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Could not analyze results.');
      setPhase('error');
    }
  }

  async function copyReport() {
    if (!analysis) return;
    const list = questions.map((q) => results.get(q.id)).filter((r): r is QuestionResult => !!r && !r.error);
    const markdown = buildReportMarkdown(company.trim(), list, analysis, siteAudit);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied — no-op
    }
  }

  const resultList = useMemo(() => questions.map((q) => results.get(q.id)).filter(Boolean) as QuestionResult[], [questions, results]);
  const resolvedCount = resultList.length;
  const totalCount = questions.filter((q) => q.text.trim()).length;

  const isBusy = phase === 'generating' || phase === 'running' || phase === 'analyzing';

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-purple-400 mb-3">AEO Visibility Checker</p>
        <h1 className="text-3xl lg:text-4xl font-light text-white mb-2">What do AI answer engines say about you?</h1>
        <p className="text-gray-400 font-light">
          Enter a company. I'll generate the questions a real buyer would ask, run them against Claude with web
          search, and report what shows up — or doesn't.
        </p>
      </div>

      {phase === 'input' && (
        <form onSubmit={generateQuestions} className="max-w-xl mx-auto space-y-3 mb-8">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Gong"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="gong.io (optional — enables the site audit)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50"
          />
          <button
            type="submit"
            disabled={!company.trim()}
            className="w-full px-6 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate questions
          </button>
        </form>
      )}

      {phase === 'generating' && (
        <p className="text-center text-gray-400 text-sm">Working out what a buyer would actually ask…</p>
      )}

      {phase === 'review' && (
        <div className="max-w-2xl mx-auto mb-10">
          <p className="text-sm text-gray-400 mb-4 text-center">
            Here's what I'd ask. Edit anything, remove what doesn't fit — these are the questions that'll actually run.
          </p>
          <div className="space-y-2 mb-6">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 mt-1.5 ${
                    q.type === 'branded' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  }`}
                >
                  {q.type}
                </span>
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none resize-none"
                />
                <button type="button" onClick={() => removeQuestion(q.id)} className="text-gray-600 hover:text-red-400 shrink-0 mt-1">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={runCheck}
            disabled={questions.filter((q) => q.text.trim()).length === 0}
            className="w-full px-6 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            Run check ({questions.filter((q) => q.text.trim()).length} questions)
          </button>
        </div>
      )}

      {isBusy && phase !== 'generating' && (
        <div className="max-w-xl mx-auto text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-2">
            <span className={phase === 'running' ? 'text-white' : ''}>Running questions ({resolvedCount}/{totalCount})</span>
            <span className="text-gray-700">→</span>
            <span className={phase === 'analyzing' ? 'text-white' : ''}>Analyzing</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 transition-all duration-500 rounded-full"
              style={{ width: phase === 'analyzing' ? '90%' : `${Math.max(10, (resolvedCount / Math.max(totalCount, 1)) * 80)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Each question is a real web search, not a lookup — this can take a minute or two.
          </p>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="max-w-xl mx-auto mb-10 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {resultList.length > 0 && (phase === 'running' || phase === 'analyzing' || phase === 'done') && !analysis && (
        <div className="max-w-3xl mx-auto space-y-2 mb-10">
          {resultList.map((r) => (
            <div key={r.questionId} className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-sm text-gray-300">{r.question}</p>
              {r.error ? (
                <p className="text-xs text-red-400 mt-1">{r.error}</p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">{r.sources.length} sources cited</p>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === 'done' && analysis && (
        <div className="max-w-4xl mx-auto space-y-10">
          <section className="bg-black/40 border-t-2 border-purple-500/40 rounded-lg p-6 text-center">
            <p className="text-4xl font-light text-white mb-1">
              {analysis.visibility.appearedIn} <span className="text-gray-600">/ {analysis.visibility.totalQuestions}</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">answers mentioned {company}</p>
            {analysis.competitors.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {analysis.competitors.map((c) => (
                  <span key={c.name} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                    {c.name} · {c.mentionCount}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600 mt-4">
              One run, one model (Claude, with web search). ChatGPT, Perplexity, and Gemini will differ — and re-running this may vary too.
            </p>
          </section>

          <section className="bg-black/40 border border-white/10 rounded-lg p-5">
            <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">Characterization</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{analysis.characterization}</p>
          </section>

          <section className="bg-black/40 border border-red-500/20 rounded-lg p-5">
            <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3">Factual Errors</h2>
            {analysis.factualErrors.length === 0 ? (
              <p className="text-sm text-gray-500">None flagged this run.</p>
            ) : (
              <ul className="space-y-2">
                {analysis.factualErrors.map((e, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-red-400 shrink-0">⚠</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="bg-black/40 border border-white/10 rounded-lg p-5">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">Gaps</h2>
              {analysis.gaps.length === 0 ? (
                <p className="text-sm text-gray-500">None identified.</p>
              ) : (
                <ul className="space-y-2">
                  {analysis.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-purple-400 shrink-0">—</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-black/40 border border-white/10 rounded-lg p-5">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">Source Attribution</h2>
              {analysis.sourceAttribution.length === 0 ? (
                <p className="text-sm text-gray-500">No sources cited.</p>
              ) : (
                <ul className="space-y-1.5">
                  {analysis.sourceAttribution.map((s) => (
                    <li key={s.domain} className="text-sm text-gray-300 flex items-center justify-between">
                      <span>{s.domain}</span>
                      <span className="text-xs text-gray-500">{CATEGORY_LABEL[s.category]} · {s.mentionCount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {siteAudit && (
            <section className="bg-black/40 border border-white/10 rounded-lg p-5">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider mb-3">Site Audit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
                <div>
                  <p className="text-lg text-white">{siteAudit.schema.present ? '✓' : '✕'}</p>
                  <p className="text-xs text-gray-500">Schema.org</p>
                </div>
                <div>
                  <p className="text-lg text-white">{siteAudit.description.metaDescription ? '✓' : '✕'}</p>
                  <p className="text-xs text-gray-500">Meta description</p>
                </div>
                <div>
                  <p className="text-lg text-white">{siteAudit.llmsTxtPresent ? '✓' : '✕'}</p>
                  <p className="text-xs text-gray-500">llms.txt</p>
                </div>
                <div>
                  <p className="text-lg text-white">{siteAudit.comparison.hasFaqLink ? '✓' : '✕'}</p>
                  <p className="text-xs text-gray-500">FAQ page</p>
                </div>
              </div>
              {siteAudit.aiCrawlerAccess && Object.values(siteAudit.aiCrawlerAccess).some((v) => v === 'blocked') && (
                <p className="text-sm text-red-400 mb-3">
                  ⚠ Blocking AI crawlers: {Object.entries(siteAudit.aiCrawlerAccess).filter(([, v]) => v === 'blocked').map(([b]) => b).join(', ')}
                </p>
              )}
              {analysis.siteConnections.length > 0 && (
                <ul className="space-y-2 pt-3 border-t border-white/10">
                  {analysis.siteConnections.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-purple-400 shrink-0">—</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="bg-black/40 border-t-2 border-purple-500/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white uppercase tracking-wider">What I'd Fix First</h2>
              <button
                type="button"
                onClick={copyReport}
                className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
              >
                {copied ? 'Copied ✓' : 'Copy report'}
              </button>
            </div>
            <ol className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-gray-300 leading-relaxed flex gap-3">
                  <span className="text-purple-400 font-mono shrink-0">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-light text-white mb-4">Question by Question</h2>
            <div className="space-y-2">
              {resultList.map((r) => {
                const prom = analysis.questionResults.find((q) => q.questionId === r.questionId)?.prominence || 'absent';
                const open = expandedQ === r.questionId;
                return (
                  <div key={r.questionId} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedQ(open ? null : r.questionId)}
                      className="w-full flex items-center justify-between text-left gap-3"
                    >
                      <span className="text-sm text-gray-200">{r.question}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${PROMINENCE_STYLE[prom]}`}>
                        {PROMINENCE_LABEL[prom]}
                      </span>
                    </button>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{highlightBrand(r.answerText, company)}</p>
                        {r.sources.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.sources.map((s) => (
                              <a
                                key={s.url}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-gray-300 underline"
                              >
                                {new URL(s.url).hostname.replace(/^www\./, '')}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
