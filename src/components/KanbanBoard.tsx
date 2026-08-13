import React, { useEffect, useState } from 'react';

interface RoadmapLabel {
  id: string;
  name: string;
  color: string;
}

type RoadmapAssignee = { name: string; avatarUrl: string | null } | null;

interface RoadmapIssue {
  id: string;
  identifier: string;
  title: string;
  priority: number;
  updatedAt: string;
  dueDate: string | null;
  estimate: number | null;
  url: string;
  labels: RoadmapLabel[];
  assignee: RoadmapAssignee;
  githubLinks: { url: string; title: string }[];
}

interface GithubIssue {
  id: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  labels: RoadmapLabel[];
  assignee: RoadmapAssignee;
}

type RoadmapColumns = Record<string, RoadmapIssue[]>;
type GithubColumns = Record<string, GithubIssue[]>;

const LINEAR_COLUMN_ORDER = ['Backlog', 'Planned', 'In Progress', 'Shipped'];
const LINEAR_COLUMN_ACCENT: Record<string, string> = {
  Backlog: 'border-gray-500/40',
  Planned: 'border-blue-500/40',
  'In Progress': 'border-purple-500/40',
  Shipped: 'border-green-500/40',
};

const GITHUB_COLUMN_ORDER = ['Backlog', 'In Progress', 'In Review', 'Shipped'];
const GITHUB_COLUMN_ACCENT: Record<string, string> = {
  Backlog: 'border-gray-500/40',
  'In Progress': 'border-purple-500/40',
  'In Review': 'border-blue-500/40',
  Shipped: 'border-green-500/40',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

function FlagIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M4 2a1 1 0 00-1 1v14a1 1 0 102 0v-4.586l1.293-1.293a1 1 0 011.414 0L9 12.414a1 1 0 001.414 0l1.293-1.293a1 1 0 011.414 0L14.414 12.414A1 1 0 0016 11.707V4.293a1 1 0 00-1.707-.707L13 4.879a1 1 0 01-1.414 0L10.293 3.586a1 1 0 00-1.414 0L7.586 4.879a1 1 0 01-1.414 0L4.879 3.586A1 1 0 004 3z" />
    </svg>
  );
}

function PriorityBars({ level }: { level: number }) {
  const filled = 4 - level; // priority 2 (High) -> 3 bars, 3 (Medium) -> 2, 4 (Low) -> 1
  const heights = [4, 7, 10];
  return (
    <div className="flex items-end gap-[2px] h-2.5" title={PRIORITY_LABEL[level]}>
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-sm ${i < filled ? 'bg-gray-300' : 'bg-gray-700'}`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

function PriorityIcon({ priority }: { priority: number }) {
  if (!priority) return null;
  if (priority === 1) return <FlagIcon />;
  return <PriorityBars level={priority} />;
}

function AssigneeAvatar({ assignee }: { assignee: RoadmapIssue['assignee'] }) {
  if (!assignee) return null;
  const initials = assignee.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (assignee.avatarUrl) {
    return (
      <img
        src={assignee.avatarUrl}
        alt={assignee.name}
        title={assignee.name}
        className="w-5 h-5 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      title={assignee.name}
      className="w-5 h-5 rounded-full bg-white/10 text-[9px] flex items-center justify-center text-gray-300 shrink-0"
    >
      {initials}
    </div>
  );
}

function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const isOverdue = date < new Date(new Date().toDateString());
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded ${
        isOverdue ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-gray-400'
      }`}
    >
      {label}
    </span>
  );
}

function LabelTags({ labels }: { labels: RoadmapLabel[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {labels.map((label) => (
        <span
          key={label.id}
          className="text-[10px] px-1.5 py-0.5 rounded-full border"
          style={{
            color: label.color,
            borderColor: `${label.color}40`,
            backgroundColor: `${label.color}1a`,
          }}
        >
          {label.name}
        </span>
      ))}
    </div>
  );
}

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
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          <AssigneeAvatar assignee={issue.assignee} />
        </div>
      </div>

      <p className="text-sm text-gray-200 leading-snug">{issue.title}</p>

      <LabelTags labels={issue.labels} />

      {(issue.dueDate || issue.estimate != null || issue.githubLinks.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <DueDateBadge dueDate={issue.dueDate} />
          {issue.estimate != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
              {issue.estimate} pt{issue.estimate === 1 ? '' : 's'}
            </span>
          )}
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

function GithubIssueCard({ issue }: { issue: GithubIssue }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-500">#{issue.number}</span>
        <AssigneeAvatar assignee={issue.assignee} />
      </div>
      <p className="text-sm text-gray-200 leading-snug">{issue.title}</p>
      <LabelTags labels={issue.labels} />
    </a>
  );
}

function Board<T extends { id: string }>({
  columnOrder,
  columnAccent,
  columns,
  renderCard,
}: {
  columnOrder: string[];
  columnAccent: Record<string, string>;
  columns: Record<string, T[]>;
  renderCard: (item: T) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
      {columnOrder.map((columnName) => (
        <div
          key={columnName}
          className={`bg-black/40 border-t-2 ${columnAccent[columnName]} rounded-lg p-3`}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">{columnName}</h3>
            <span className="text-xs text-gray-500">{columns[columnName]?.length ?? 0}</span>
          </div>
          <div className="space-y-2">
            {(columns[columnName] ?? []).map((item) => (
              <React.Fragment key={item.id}>{renderCard(item)}</React.Fragment>
            ))}
            {(columns[columnName] ?? []).length === 0 && (
              <p className="text-xs text-gray-600 px-1">Nothing here</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function useFetchColumns<T>(url: string) {
  const [columns, setColumns] = useState<Record<string, T[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load board');
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
  }, [url]);

  return { columns, error };
}

export default function KanbanBoard() {
  const linear = useFetchColumns<RoadmapIssue>('/api/roadmap');
  const github = useFetchColumns<GithubIssue>('/api/github-roadmap');

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      <section>
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400 mb-3">Agentic Engineering Team</p>
          <h1 className="text-3xl lg:text-4xl font-light text-white mb-2">What My AI Team Is Building</h1>
          <p className="text-gray-400 font-light">
            An autonomous dev team shipping this roadmap for me, synced live from Linear.
          </p>
        </div>

        {linear.error && <p className="text-center text-red-400 text-sm">{linear.error}</p>}
        {!linear.error && !linear.columns && (
          <p className="text-center text-gray-500 text-sm">Loading roadmap...</p>
        )}
        {linear.columns && (
          <Board
            columnOrder={LINEAR_COLUMN_ORDER}
            columnAccent={LINEAR_COLUMN_ACCENT}
            columns={linear.columns}
            renderCard={(issue) => <IssueCard issue={issue} />}
          />
        )}
      </section>

      <section>
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-light text-white mb-2">GitHub Activity</h2>
          <p className="text-gray-400 font-light">
            Live from{' '}
            <a
              href="https://github.com/feverdreaminteractive/team-dev-showcase/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 underline hover:text-white"
            >
              team-dev-showcase
            </a>
            , the repo my AI team files its own work in.
          </p>
        </div>

        {github.error && <p className="text-center text-red-400 text-sm">{github.error}</p>}
        {!github.error && !github.columns && (
          <p className="text-center text-gray-500 text-sm">Loading GitHub activity...</p>
        )}
        {github.columns && (
          <Board
            columnOrder={GITHUB_COLUMN_ORDER}
            columnAccent={GITHUB_COLUMN_ACCENT}
            columns={github.columns}
            renderCard={(issue) => <GithubIssueCard issue={issue} />}
          />
        )}
      </section>
    </div>
  );
}
