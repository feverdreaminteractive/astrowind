import React, { useEffect, useState } from 'react';

interface RoadmapIssue {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  updatedAt: string;
  url: string;
  githubLinks: { url: string; title: string }[];
}

type RoadmapColumns = Record<string, RoadmapIssue[]>;

const COLUMN_ORDER = ['Backlog', 'Planned', 'In Progress', 'Shipped'];

const COLUMN_ACCENT: Record<string, string> = {
  Backlog: 'border-gray-500/40',
  Planned: 'border-blue-500/40',
  'In Progress': 'border-purple-500/40',
  Shipped: 'border-green-500/40',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

function GithubIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.762-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.92.43.372.823 1.102.823 2.222 0 1.604-.015 2.897-.015 3.293 0 .322.216.696.825.577C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function IssueCard({ issue }: { issue: RoadmapIssue }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-500">{issue.identifier}</span>
        {PRIORITY_LABEL[issue.priority] && (
          <span className="text-[10px] uppercase tracking-wider text-gray-500">
            {PRIORITY_LABEL[issue.priority]}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-200 leading-snug">{issue.title}</p>
      {issue.githubLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {issue.githubLinks.map((link) => (
            <span
              key={link.url}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500"
              title={link.title}
            >
              <GithubIcon />
              PR
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export default function KanbanBoard() {
  const [columns, setColumns] = useState<RoadmapColumns | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/roadmap')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load roadmap');
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setColumns(data.columns);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl lg:text-4xl font-light text-white mb-2">Roadmap</h1>
        <p className="text-gray-400 font-light">What I'm building next, synced live from Linear.</p>
      </div>

      {error && (
        <p className="text-center text-red-400 text-sm">{error}</p>
      )}

      {!error && !columns && (
        <p className="text-center text-gray-500 text-sm">Loading roadmap...</p>
      )}

      {columns && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {COLUMN_ORDER.map((columnName) => (
            <div
              key={columnName}
              className={`bg-black/40 border-t-2 ${COLUMN_ACCENT[columnName]} rounded-lg p-3`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-medium text-white uppercase tracking-wider">
                  {columnName}
                </h2>
                <span className="text-xs text-gray-500">{columns[columnName]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(columns[columnName] ?? []).map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
                {(columns[columnName] ?? []).length === 0 && (
                  <p className="text-xs text-gray-600 px-1">Nothing here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
