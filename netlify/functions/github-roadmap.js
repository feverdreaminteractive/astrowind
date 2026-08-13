// GitHub roadmap endpoint - shows what the "agentic dev team" is tracking in its own repo,
// alongside the Linear-backed roadmap.
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const REPO = 'feverdreaminteractive/team-dev-showcase';

function columnForIssue(issue) {
  if (issue.state === 'closed') return 'Shipped';
  const labelNames = issue.labels.map((l) => (typeof l === 'string' ? l : l.name));
  if (labelNames.includes('ready-for-review')) return 'In Review';
  if (labelNames.includes('in-progress')) return 'In Progress';
  return 'Backlog';
}

export default async (req, context) => {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  const cached = cache.get('github-roadmap');
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not configured in environment variables');
    return new Response(JSON.stringify({ error: 'GitHub board is not configured. Please contact support.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const ghResponse = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ryanclayton-portfolio-roadmap',
      },
    });

    if (!ghResponse.ok) {
      throw new Error(`GitHub API returned ${ghResponse.status}`);
    }

    const issues = await ghResponse.json();

    const columns = { Backlog: [], 'In Progress': [], 'In Review': [], Shipped: [] };

    for (const issue of issues) {
      if (issue.pull_request) continue; // GitHub's issues endpoint also returns PRs

      const columnName = columnForIssue(issue);
      columns[columnName].push({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        createdAt: issue.created_at,
        labels: issue.labels.map((l) => ({
          id: typeof l === 'string' ? l : String(l.id),
          name: typeof l === 'string' ? l : l.name,
          color: `#${typeof l === 'string' ? '888888' : l.color}`,
        })),
        assignee: issue.assignee ? { name: issue.assignee.login, avatarUrl: issue.assignee.avatar_url } : null,
      });
    }

    const result = { repo: REPO, columns, fetchedAt: new Date().toISOString() };
    cache.set('github-roadmap', { data: result, timestamp: Date.now() });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Failed to fetch GitHub roadmap:', error);
    return new Response(JSON.stringify({ error: 'Failed to load GitHub board data.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
