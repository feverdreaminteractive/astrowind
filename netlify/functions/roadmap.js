// Roadmap endpoint - fetches Linear issues and groups them by status for the public roadmap board.
// Cross-references GitHub attachments Linear already tracks on each issue (no direct GitHub API call needed).
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const COLUMN_BY_STATE_TYPE = {
  backlog: 'Backlog',
  unstarted: 'Planned',
  started: 'In Progress',
  completed: 'Shipped',
};

const LINEAR_QUERY = `
  query RoadmapIssues {
    issues(
      first: 150
      orderBy: updatedAt
      filter: {
        team: { key: { eq: "FEV" } }
        state: { type: { nin: ["cancelled", "triage"] } }
      }
    ) {
      nodes {
        id
        identifier
        title
        priority
        updatedAt
        dueDate
        estimate
        url
        state {
          name
          type
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        assignee {
          id
          name
          avatarUrl
        }
        attachments {
          nodes {
            url
            title
            sourceType
          }
        }
      }
    }
  }
`;

export default async (req, context) => {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  const cached = cache.get('roadmap');
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

  if (!LINEAR_API_KEY) {
    console.error('LINEAR_API_KEY not configured in environment variables');
    return new Response(JSON.stringify({ error: 'Roadmap is not configured. Please contact support.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const linearResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: LINEAR_QUERY }),
    });

    if (!linearResponse.ok) {
      throw new Error(`Linear API returned ${linearResponse.status}`);
    }

    const { data, errors } = await linearResponse.json();

    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }

    const columns = { Backlog: [], Planned: [], 'In Progress': [], Shipped: [] };

    for (const issue of data.issues.nodes) {
      const columnName = COLUMN_BY_STATE_TYPE[issue.state.type];
      if (!columnName) continue;

      const githubLinks = issue.attachments.nodes
        .filter((a) => a.sourceType === 'github' || a.url.includes('github.com'))
        .map((a) => ({ url: a.url, title: a.title }));

      columns[columnName].push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        priority: issue.priority,
        updatedAt: issue.updatedAt,
        dueDate: issue.dueDate,
        estimate: issue.estimate,
        url: issue.url,
        labels: issue.labels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
        assignee: issue.assignee ? { name: issue.assignee.name, avatarUrl: issue.assignee.avatarUrl } : null,
        githubLinks,
      });
    }

    const result = { columns, fetchedAt: new Date().toISOString() };
    cache.set('roadmap', { data: result, timestamp: Date.now() });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Failed to fetch roadmap:', error);
    return new Response(JSON.stringify({ error: 'Failed to load roadmap data.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
};
