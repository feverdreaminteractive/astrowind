import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';

// Small dev team personas
const TEAM_MEMBERS = {
  lead: {
    name: 'Alex Chen',
    role: 'Tech Lead',
    expertise: ['Architecture', 'Code Review', 'TypeScript', 'System Design'],
    style: 'Thorough, focuses on scalability and best practices'
  },
  frontend: {
    name: 'Sarah Martinez',
    role: 'Frontend Developer',
    expertise: ['React', 'Vue', 'UI/UX', 'Performance Optimization'],
    style: 'Detail-oriented, cares about user experience and accessibility'
  },
  backend: {
    name: 'Marcus Johnson',
    role: 'Backend Developer',
    expertise: ['Node.js', 'Python', 'Database Design', 'API Development'],
    style: 'Pragmatic, emphasizes security and efficiency'
  },
  devops: {
    name: 'Jordan Kim',
    role: 'DevOps Engineer',
    expertise: ['CI/CD', 'AWS', 'Docker', 'Monitoring'],
    style: 'Automation-focused, monitors performance and reliability'
  }
};

class GitHubTeamServer {
  constructor() {
    this.server = new Server(
      {
        name: 'github-team-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Initialize GitHub client
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'team_review_pr',
          description: 'Get team review comments on a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              pr_number: { type: 'number', description: 'Pull request number' }
            },
            required: ['owner', 'repo', 'pr_number']
          }
        },
        {
          name: 'team_standup',
          description: 'Generate a team standup report from recent commits',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              days: { type: 'number', description: 'Number of days to look back', default: 1 }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'team_code_review',
          description: 'Simulate team code review on recent changes',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              branch: { type: 'string', description: 'Branch to review', default: 'main' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'team_planning',
          description: 'Team discussion on open issues and planning',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              label: { type: 'string', description: 'Filter issues by label' }
            },
            required: ['owner', 'repo']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'team_review_pr':
          return await this.teamReviewPR(args);
        case 'team_standup':
          return await this.teamStandup(args);
        case 'team_code_review':
          return await this.teamCodeReview(args);
        case 'team_planning':
          return await this.teamPlanning(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async teamReviewPR(args) {
    try {
      const { owner, repo, pr_number } = args;

      // Fetch PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pr_number
      });

      // Fetch PR files
      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pr_number
      });

      // Generate team reviews based on file changes
      let reviews = [];

      // Tech Lead review
      reviews.push({
        reviewer: TEAM_MEMBERS.lead.name,
        role: TEAM_MEMBERS.lead.role,
        comment: `I've reviewed the overall architecture of this PR. ${pr.additions > 500 ? 'This is a large changeset - consider breaking it into smaller PRs for easier review.' : 'The scope looks manageable.'} Make sure we have proper error handling and tests for the new functionality.`
      });

      // Frontend review if UI files changed
      const hasUIChanges = files.some(f =>
        f.filename.includes('.jsx') || f.filename.includes('.tsx') ||
        f.filename.includes('.css') || f.filename.includes('.vue')
      );
      if (hasUIChanges) {
        reviews.push({
          reviewer: TEAM_MEMBERS.frontend.name,
          role: TEAM_MEMBERS.frontend.role,
          comment: 'UI changes detected. Please ensure components are accessible (ARIA labels, keyboard navigation) and responsive. Have you tested this on mobile devices?'
        });
      }

      // Backend review if API files changed
      const hasAPIChanges = files.some(f =>
        f.filename.includes('api/') || f.filename.includes('server') ||
        f.filename.includes('controller') || f.filename.includes('model')
      );
      if (hasAPIChanges) {
        reviews.push({
          reviewer: TEAM_MEMBERS.backend.name,
          role: TEAM_MEMBERS.backend.role,
          comment: 'API modifications noted. Ensure proper input validation and consider rate limiting if this is a public endpoint. Have we updated the API documentation?'
        });
      }

      // DevOps review if config files changed
      const hasConfigChanges = files.some(f =>
        f.filename.includes('.yml') || f.filename.includes('.yaml') ||
        f.filename.includes('Dockerfile') || f.filename.includes('.env')
      );
      if (hasConfigChanges) {
        reviews.push({
          reviewer: TEAM_MEMBERS.devops.name,
          role: TEAM_MEMBERS.devops.role,
          comment: 'Configuration changes detected. Please verify these work in staging environment first. Any new environment variables should be documented in the README.'
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Team Review for PR #${pr_number}: ${pr.title}\n\n${reviews.map(r =>
              `**${r.reviewer}** (${r.role}):\n${r.comment}`
            ).join('\n\n')}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error reviewing PR: ${error.message}` }]
      };
    }
  }

  async teamStandup(args) {
    try {
      const { owner, repo, days = 1 } = args;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch recent commits
      const { data: commits } = await this.octokit.repos.listCommits({
        owner,
        repo,
        since,
        per_page: 20
      });

      // Group commits by author and generate standup
      const authorCommits = {};
      commits.forEach(commit => {
        const author = commit.author?.login || 'unknown';
        if (!authorCommits[author]) {
          authorCommits[author] = [];
        }
        authorCommits[author].push(commit.commit.message);
      });

      // Generate team member updates
      let standupNotes = '## Daily Standup Report\n\n';

      // Assign commits to team members (simulated)
      const teamUpdates = [
        {
          member: TEAM_MEMBERS.lead,
          yesterday: commits.length > 0 ? 'Reviewed and merged 2 PRs, updated architecture docs' : 'Conducted code reviews',
          today: 'Planning sprint tasks, pair programming session with frontend team',
          blockers: 'None'
        },
        {
          member: TEAM_MEMBERS.frontend,
          yesterday: commits.some(c => c.commit.message.toLowerCase().includes('ui')) ?
            'Implemented new dashboard components' : 'Worked on responsive design',
          today: 'Adding accessibility features, unit tests for new components',
          blockers: 'Waiting for API endpoint documentation'
        },
        {
          member: TEAM_MEMBERS.backend,
          yesterday: commits.some(c => c.commit.message.toLowerCase().includes('api')) ?
            'Completed REST API endpoints' : 'Optimized database queries',
          today: 'Implementing caching layer, writing integration tests',
          blockers: 'None'
        },
        {
          member: TEAM_MEMBERS.devops,
          yesterday: 'Updated CI/CD pipeline, monitoring alerts configured',
          today: 'Docker image optimization, setting up staging environment',
          blockers: 'Need AWS credentials for new service'
        }
      ];

      teamUpdates.forEach(update => {
        standupNotes += `### ${update.member.name} (${update.member.role})\n`;
        standupNotes += `- **Yesterday:** ${update.yesterday}\n`;
        standupNotes += `- **Today:** ${update.today}\n`;
        standupNotes += `- **Blockers:** ${update.blockers}\n\n`;
      });

      if (commits.length > 0) {
        standupNotes += `### Recent Commits (last ${days} day${days > 1 ? 's' : ''}):\n`;
        commits.slice(0, 5).forEach(commit => {
          standupNotes += `- ${commit.commit.message.split('\n')[0]} (${commit.author?.login || 'unknown'})\n`;
        });
      }

      return {
        content: [{ type: 'text', text: standupNotes }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error generating standup: ${error.message}` }]
      };
    }
  }

  async teamCodeReview(args) {
    try {
      const { owner, repo, branch = 'main' } = args;

      // Get recent commits
      const { data: commits } = await this.octokit.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: 5
      });

      if (commits.length === 0) {
        return {
          content: [{ type: 'text', text: 'No recent commits to review.' }]
        };
      }

      // Simulate code review discussion
      let review = '## Team Code Review Session\n\n';

      const latestCommit = commits[0];
      review += `**Reviewing:** ${latestCommit.commit.message.split('\n')[0]}\n`;
      review += `**Author:** ${latestCommit.author?.login || 'unknown'}\n\n`;

      // Tech Lead perspective
      review += `### ${TEAM_MEMBERS.lead.name} (${TEAM_MEMBERS.lead.role}):\n`;
      review += `"Looking at the overall structure, this follows our established patterns well. `;
      review += `Consider adding more comprehensive error handling, especially for edge cases. `;
      review += `Good use of TypeScript types for maintaining code quality."\n\n`;

      // Frontend perspective
      review += `### ${TEAM_MEMBERS.frontend.name} (${TEAM_MEMBERS.frontend.role}):\n`;
      review += `"From a UI perspective, make sure we're maintaining consistency with our design system. `;
      review += `Have we considered the loading states and error boundaries? `;
      review += `Also, let's ensure this is tested across different screen sizes."\n\n`;

      // Backend perspective
      review += `### ${TEAM_MEMBERS.backend.name} (${TEAM_MEMBERS.backend.role}):\n`;
      review += `"The logic looks solid. I'd suggest adding input validation if we haven't already. `;
      review += `Also, consider the performance implications if this scales to thousands of users. `;
      review += `We might want to add some caching here."\n\n`;

      // DevOps perspective
      review += `### ${TEAM_MEMBERS.devops.name} (${TEAM_MEMBERS.devops.role}):\n`;
      review += `"Let's make sure this deploys cleanly through our CI/CD pipeline. `;
      review += `Are there any new environment variables or configuration changes needed? `;
      review += `I'll monitor the performance metrics after deployment."\n\n`;

      review += '**Consensus:** Approved with minor suggestions. Address the feedback in a follow-up PR.';

      return {
        content: [{ type: 'text', text: review }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error during code review: ${error.message}` }]
      };
    }
  }

  async teamPlanning(args) {
    try {
      const { owner, repo, label } = args;

      // Fetch open issues
      const params = {
        owner,
        repo,
        state: 'open',
        per_page: 10
      };
      if (label) params.labels = label;

      const { data: issues } = await this.octokit.issues.listForRepo(params);

      let planning = '## Team Planning Session\n\n';

      if (issues.length === 0) {
        planning += 'No open issues to discuss.\n';
      } else {
        planning += `**Discussing ${issues.length} open issue${issues.length > 1 ? 's' : ''}:**\n\n`;

        issues.slice(0, 5).forEach(issue => {
          planning += `### Issue #${issue.number}: ${issue.title}\n`;

          // Assign team members based on labels
          const assignments = [];
          if (issue.labels.some(l => l.name?.includes('frontend'))) {
            assignments.push(TEAM_MEMBERS.frontend.name);
          }
          if (issue.labels.some(l => l.name?.includes('backend'))) {
            assignments.push(TEAM_MEMBERS.backend.name);
          }
          if (issue.labels.some(l => l.name?.includes('devops'))) {
            assignments.push(TEAM_MEMBERS.devops.name);
          }
          if (assignments.length === 0) {
            assignments.push(TEAM_MEMBERS.lead.name); // Tech lead takes unassigned
          }

          planning += `**Assigned to:** ${assignments.join(', ')}\n`;
          planning += `**Priority:** ${issue.labels.find(l => l.name?.includes('priority'))?.name || 'Medium'}\n`;
          planning += `**Estimated effort:** ${issue.labels.find(l => l.name?.includes('effort'))?.name || '2-3 days'}\n\n`;

          // Add team discussion
          planning += `**Team Discussion:**\n`;
          planning += `- ${TEAM_MEMBERS.lead.name}: "Let's break this down into smaller tasks"\n`;
          planning += `- ${assignments[0]}: "I can take the lead on this"\n`;
          planning += `- ${TEAM_MEMBERS.devops.name}: "I'll set up the testing environment"\n\n`;
        });
      }

      planning += '**Next Steps:** Update issue assignments and create subtasks in GitHub Projects.';

      return {
        content: [{ type: 'text', text: planning }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error during planning: ${error.message}` }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Team MCP server running...');
  }
}

// Start the server
const server = new GitHubTeamServer();
server.run().catch(console.error);