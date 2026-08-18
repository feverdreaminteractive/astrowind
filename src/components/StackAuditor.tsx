import React, { useMemo, useState } from 'react';

interface Evidence {
  type: string;
  match: string;
}

interface DetectedTool {
  id: string;
  name: string;
  category: string;
  vendor: string;
  confidence: 'high' | 'medium';
  evidence: Evidence[];
}

interface ScanSignals {
  hasConsentManager: boolean;
  hasDataLayer: boolean;
  formEndpoints: string[];
  scriptCount: number;
  externalScriptCount: number;
  inlineScriptCount: number;
  inlineScriptBytes: number;
}

interface ScanResult {
  url: string;
  scannedAt: string;
  detected: DetectedTool[];
  signals: ScanSignals;
  caveat: string;
}

interface Analysis {
  summary: string;
  redundancies: string[];
  gaps: string[];
  risks: string[];
  recommendations: string[];
}

type Phase = 'idle' | 'fetching' | 'detecting' | 'analyzing' | 'done' | 'error';

const EXAMPLE_URL = 'hubspot.com';

const EVIDENCE_LABEL: Record<string, string> = {
  scriptHost: 'Script host',
  urlSubstring: 'URL match',
  inlineRegex: 'Inline script',
  domRegex: 'Page markup',
  cookieName: 'Cookie',
};

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' }) {
  const styles =
    confidence === 'high'
      ? 'bg-green-500/15 text-green-400 border-green-500/30'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles}`}>
      {confidence}
    </span>
  );
}

function ToolCard({ tool }: { tool: DetectedTool }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm text-gray-200">{tool.name}</p>
          <p className="text-xs text-gray-500">{tool.vendor}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge confidence={tool.confidence} />
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
          {tool.evidence.map((ev, i) => (
            <p key={i} className="text-xs text-gray-500">
              <span className="text-gray-400">{EVIDENCE_LABEL[ev.type] || ev.type}:</span>{' '}
              <code className="text-gray-400">{ev.match}</code>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-5">
      <h3 className="text-sm font-medium text-white uppercase tracking-wider mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">None identified.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-gray-300 leading-relaxed flex gap-2">
              <span className="text-purple-400 shrink-0">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildReportMarkdown(scan: ScanResult, analysis: Analysis): string {
  const byCategory = new Map<string, DetectedTool[]>();
  for (const tool of scan.detected) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  const lines: string[] = [];
  lines.push(`# Martech Stack Audit — ${scan.url}`);
  lines.push(`_Scanned ${new Date(scan.scannedAt).toLocaleString()}_`);
  lines.push('');
  lines.push('## Detected Stack');
  if (scan.detected.length === 0) {
    lines.push('No martech tools detected in the server-rendered HTML.');
  } else {
    for (const [category, tools] of byCategory) {
      lines.push(`### ${category}`);
      for (const tool of tools) {
        lines.push(`- **${tool.name}** (${tool.vendor}) — ${tool.confidence} confidence`);
      }
    }
  }
  lines.push('');
  lines.push('## AI Analysis');
  lines.push('');
  lines.push('### Summary');
  lines.push(analysis.summary);
  lines.push('');
  lines.push('### Redundancies');
  lines.push(...(analysis.redundancies.length ? analysis.redundancies.map((r) => `- ${r}`) : ['None identified.']));
  lines.push('');
  lines.push('### Gaps');
  lines.push(...(analysis.gaps.length ? analysis.gaps.map((r) => `- ${r}`) : ['None identified.']));
  lines.push('');
  lines.push('### Data Flow Risks');
  lines.push(...(analysis.risks.length ? analysis.risks.map((r) => `- ${r}`) : ['None identified.']));
  lines.push('');
  lines.push("### What I'd Do First");
  lines.push(...analysis.recommendations.map((r, i) => `${i + 1}. ${r}`));
  lines.push('');
  lines.push(`_${scan.caveat}_`);

  return lines.join('\n');
}

export default function StackAuditor() {
  const [urlInput, setUrlInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);

  const groupedTools = useMemo(() => {
    if (!scan) return [];
    const map = new Map<string, DetectedTool[]>();
    for (const tool of scan.detected) {
      const list = map.get(tool.category) ?? [];
      list.push(tool);
      map.set(tool.category, list);
    }
    return [...map.entries()];
  }, [scan]);

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim() || phase === 'fetching' || phase === 'detecting' || phase === 'analyzing') return;

    setError(null);
    setScan(null);
    setAnalysis(null);
    setCopied(false);
    setPhase('fetching');

    const detectingTimer = setTimeout(() => setPhase('detecting'), 900);

    let scanResult: ScanResult;
    try {
      const res = await fetch('/api/stack-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const body = await res.json();
      clearTimeout(detectingTimer);
      if (!res.ok) {
        throw new Error(body.error || 'Could not scan that site.');
      }
      scanResult = body;
      setScan(scanResult);
    } catch (err: any) {
      clearTimeout(detectingTimer);
      setError(err.message || 'Could not scan that site.');
      setPhase('error');
      return;
    }

    setPhase('analyzing');
    try {
      const res = await fetch('/api/stack-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan: scanResult }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Could not analyze that stack.');
      }
      setAnalysis(body.analysis);
      setPhase('done');
    } catch (err: any) {
      setError(err.message || 'Could not analyze that stack.');
      setPhase('error');
    }
  }

  async function copyReport() {
    if (!scan || !analysis) return;
    const markdown = buildReportMarkdown(scan, analysis);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — silently no-op, button stays actionable
    }
  }

  const isBusy = phase === 'fetching' || phase === 'detecting' || phase === 'analyzing';

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-purple-400 mb-3">Martech Stack Auditor</p>
        <h1 className="text-3xl lg:text-4xl font-light text-white mb-2">What's actually running on that site?</h1>
        <p className="text-gray-400 font-light">
          Paste a URL. I'll detect the martech stack and have an AI marketing ops architect read it — gaps,
          redundancies, and what it says about how that team operates.
        </p>
      </div>

      <form onSubmit={runAudit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2 mb-8">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={EXAMPLE_URL}
          disabled={isBusy}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isBusy || !urlInput.trim()}
          className="px-6 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBusy ? 'Auditing…' : 'Audit stack'}
        </button>
      </form>

      {isBusy && (
        <div className="max-w-xl mx-auto text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <span className={phase === 'fetching' ? 'text-white' : ''}>Fetching</span>
            <span className="text-gray-700">→</span>
            <span className={phase === 'detecting' ? 'text-white' : ''}>Detecting</span>
            <span className="text-gray-700">→</span>
            <span className={phase === 'analyzing' ? 'text-white' : ''}>Analyzing</span>
          </div>
          <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 transition-all duration-500 rounded-full"
              style={{
                width: phase === 'fetching' ? '20%' : phase === 'detecting' ? '45%' : '85%',
              }}
            />
          </div>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="max-w-xl mx-auto mb-10 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-600 text-xs mt-1">Some sites block automated requests — that's itself a data point.</p>
        </div>
      )}

      {scan && (
        <div className="max-w-5xl mx-auto space-y-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-white">Detected Stack</h2>
              <span className="text-sm text-gray-500">{scan.detected.length} tool{scan.detected.length === 1 ? '' : 's'}</span>
            </div>

            {scan.detected.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-gray-300">This site is running almost nothing visible.</p>
                <p className="text-sm text-gray-500 mt-1">
                  No known martech signatures matched the server-rendered HTML — see the note below on what that can and can't mean.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedTools.map(([category, tools]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-gray-500 px-1">{category}</h3>
                    <div className="space-y-2">
                      {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-600 mt-4">{scan.caveat}</p>
          </section>

          {analysis && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-white">AI Analysis</h2>
                <button
                  type="button"
                  onClick={copyReport}
                  className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                >
                  {copied ? 'Copied ✓' : 'Copy report'}
                </button>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-lg p-5 mb-4">
                <h3 className="text-sm font-medium text-white uppercase tracking-wider mb-3">Summary</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <AnalysisSection title="Redundancies" items={analysis.redundancies} />
                <AnalysisSection title="Gaps" items={analysis.gaps} />
              </div>
              <div className="mb-4">
                <AnalysisSection title="Data Flow Risks" items={analysis.risks} />
              </div>

              <div className="bg-black/40 border-t-2 border-purple-500/40 rounded-lg p-5">
                <h3 className="text-sm font-medium text-white uppercase tracking-wider mb-3">What I'd Do First</h3>
                <ol className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-300 leading-relaxed flex gap-3">
                      <span className="text-purple-400 font-mono shrink-0">{i + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
