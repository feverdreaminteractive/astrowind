# GitHub Team MCP Server

A Model Context Protocol server that simulates a small development team reviewing and discussing your GitHub repositories. Perfect for portfolios to showcase collaborative development practices.

## Features

- **Team Code Reviews**: Get simulated reviews from 4 team members with different expertise
- **Daily Standups**: Generate standup reports based on recent commits
- **PR Reviews**: Team perspectives on pull requests
- **Sprint Planning**: Team discussion on open issues

## Team Members

1. **Alex Chen** - Tech Lead (Architecture, TypeScript, System Design)
2. **Sarah Martinez** - Frontend Developer (React, Vue, UI/UX)
3. **Marcus Johnson** - Backend Developer (Node.js, APIs, Databases)
4. **Jordan Kim** - DevOps Engineer (CI/CD, AWS, Docker)

## Setup

1. Install dependencies:
```bash
npm install @modelcontextprotocol/sdk @octokit/rest
```

2. Set your GitHub token in the config or environment:
```bash
export GITHUB_TOKEN=your_github_token_here
```

3. Add to your Claude Desktop config:
```json
{
  "mcpServers": {
    "github-team": {
      "command": "node",
      "args": ["/path/to/mcp-github-team.js"],
      "env": {
        "GITHUB_TOKEN": "your_token"
      }
    }
  }
}
```

## Available Tools

### team_review_pr
Get team review comments on a pull request
```
Arguments:
- owner: Repository owner
- repo: Repository name
- pr_number: Pull request number
```

### team_standup
Generate a team standup report from recent commits
```
Arguments:
- owner: Repository owner
- repo: Repository name
- days: Number of days to look back (default: 1)
```

### team_code_review
Simulate team code review on recent changes
```
Arguments:
- owner: Repository owner
- repo: Repository name
- branch: Branch to review (default: main)
```

### team_planning
Team discussion on open issues and planning
```
Arguments:
- owner: Repository owner
- repo: Repository name
- label: Filter issues by label (optional)
```

## Example Usage

Once connected, you can ask Claude:
- "Have the team review PR #42 in my portfolio repo"
- "Generate a standup report for the last 3 days"
- "What does the team think about the open issues?"
- "Get team feedback on the main branch changes"

## Why This Showcases Your Skills

This MCP server demonstrates:
- Understanding of modern AI integration patterns
- Knowledge of GitHub API and development workflows
- Ability to simulate realistic team dynamics
- Experience with Node.js and async programming
- Familiarity with development best practices

Perfect for showing potential employers that you understand team collaboration and modern development practices!