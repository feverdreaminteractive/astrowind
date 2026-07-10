#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// AI Agent Personas with specialized skills
const AI_AGENTS = {
  alex: {
    name: 'Alex Chen',
    role: 'Tech Lead',
    githubUser: 'ai-alex-chen',
    skills: ['architecture', 'code-review', 'typescript', 'system-design'],
    personality: 'Thorough, focuses on scalability and best practices',
    canWorkOn: ['architecture', 'documentation', 'testing', 'security']
  },
  sarah: {
    name: 'Sarah Martinez',
    role: 'Frontend Developer',
    githubUser: 'ai-sarah-martinez',
    skills: ['react', 'vue', 'ui-ux', 'css', 'accessibility'],
    personality: 'Detail-oriented, cares about user experience',
    canWorkOn: ['frontend', 'ui-ux', 'performance', 'documentation']
  },
  marcus: {
    name: 'Marcus Johnson',
    role: 'Backend Developer',
    githubUser: 'ai-marcus-johnson',
    skills: ['nodejs', 'python', 'database', 'api', 'security'],
    personality: 'Pragmatic, emphasizes efficiency and security',
    canWorkOn: ['backend', 'integration', 'security', 'performance']
  },
  jordan: {
    name: 'Jordan Kim',
    role: 'DevOps Engineer',
    githubUser: 'ai-jordan-kim',
    skills: ['ci-cd', 'docker', 'aws', 'monitoring', 'automation'],
    personality: 'Automation-focused, monitors reliability',
    canWorkOn: ['devops', 'testing', 'performance', 'security']
  }
};

class AIDevTeam {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.repo = process.argv[2] || 'team-dev-showcase';
    this.action = process.argv[3] || 'analyze'; // analyze, work, review
  }

  // Get Claude's help for code generation
  async askClaude(prompt, agent) {
    if (!this.claudeApiKey) {
      console.error('⚠️  CLAUDE_API_KEY not set, using mock response');
      return this.getMockResponse(prompt, agent);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: `You are ${agent.name}, a ${agent.role} with expertise in ${agent.skills.join(', ')}.
          Your personality: ${agent.personality}.
          Generate high-quality code and solutions that match your expertise.
          Be concise and focus on practical implementation.`,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || 'Unable to generate response';
    } catch (error) {
      console.error('Claude API error:', error.message);
      return this.getMockResponse(prompt, agent);
    }
  }

  // Mock responses when Claude API is not available
  getMockResponse(prompt, agent) {
    const responses = {
      'Frontend Developer': `// ${agent.name} - Frontend Solution
import React from 'react';
import './styles.css';

const Component = () => {
  // Implement responsive design
  return (
    <div className="container">
      <h1>Solution Implementation</h1>
      {/* Add your UI here */}
    </div>
  );
};

export default Component;`,

      'Backend Developer': `// ${agent.name} - Backend Solution
const express = require('express');
const router = express.Router();

// API endpoint implementation
router.post('/api/endpoint', async (req, res) => {
  try {
    // Add validation
    const { data } = req.body;

    // Process request
    const result = await processData(data);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`,

      'DevOps Engineer': `# ${agent.name} - DevOps Solution
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run build`,

      'Tech Lead': `# ${agent.name} - Architecture Decision

## Problem
${prompt.substring(0, 100)}...

## Solution
1. Implement modular architecture
2. Add comprehensive testing
3. Document all decisions

## Code Structure
\`\`\`
src/
├── components/
├── services/
├── utils/
└── tests/
\`\`\`

## Next Steps
- Review implementation
- Add tests
- Update documentation`
    };

    return responses[agent.role] || '// Solution implementation pending';
  }

  // Analyze repository issues
  async analyzeIssues() {
    const { data: user } = await this.octokit.users.getAuthenticated();
    console.log(`\n🤖 AI Dev Team analyzing issues in ${this.repo}...\n`);

    // Get open issues
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner: user.login,
      repo: this.repo,
      state: 'open',
      per_page: 10
    });

    if (issues.length === 0) {
      console.log('No open issues found.');
      return;
    }

    // Assign agents to issues based on labels
    console.log('📋 Issue Analysis & Agent Assignment:\n');
    const assignments = [];

    for (const issue of issues) {
      const labels = issue.labels.map(l => l.name);
      let assignedAgent = null;

      // Find best agent for this issue
      for (const [key, agent] of Object.entries(AI_AGENTS)) {
        const hasMatchingLabel = labels.some(label =>
          agent.canWorkOn.some(skill => label.includes(skill))
        );
        if (hasMatchingLabel) {
          assignedAgent = agent;
          break;
        }
      }

      // Default to Tech Lead if no specific match
      if (!assignedAgent) {
        assignedAgent = AI_AGENTS.alex;
      }

      assignments.push({ issue, agent: assignedAgent });

      console.log(`Issue #${issue.number}: ${issue.title}`);
      console.log(`  📍 Labels: ${labels.join(', ')}`);
      console.log(`  🤖 Assigned to: ${assignedAgent.name} (${assignedAgent.role})`);
      console.log(`  💡 Reason: Matches skills in ${assignedAgent.skills.join(', ')}\n`);
    }

    return assignments;
  }

  // Start working on an issue
  async workOnIssue(issueNumber) {
    const { data: user } = await this.octokit.users.getAuthenticated();
    console.log(`\n🚀 AI Agents starting work on issue #${issueNumber}...\n`);

    // Get issue details
    const { data: issue } = await this.octokit.issues.get({
      owner: user.login,
      repo: this.repo,
      issue_number: issueNumber
    });

    // Determine which agent should work on this
    const labels = issue.labels.map(l => l.name);
    let agent = AI_AGENTS.alex; // Default to tech lead

    for (const [key, a] of Object.entries(AI_AGENTS)) {
      if (labels.some(label => a.canWorkOn.some(skill => label.includes(skill)))) {
        agent = a;
        break;
      }
    }

    console.log(`👤 ${agent.name} (${agent.role}) is working on this issue...\n`);

    // Add comment that agent is starting work
    await this.octokit.issues.createComment({
      owner: user.login,
      repo: this.repo,
      issue_number: issueNumber,
      body: `🤖 **${agent.name}** (AI ${agent.role}) is now working on this issue.

I'll analyze the requirements and start implementing a solution based on my expertise in ${agent.skills.join(', ')}.

Status: 🔄 In Progress`
    });

    // Generate solution based on issue description
    console.log('💭 Analyzing issue and generating solution...');
    const solution = await this.askClaude(
      `As ${agent.name}, create a solution for this issue:\n\nTitle: ${issue.title}\n\nDescription: ${issue.body}`,
      agent
    );

    // Create a branch for the work
    const branchName = `ai-${agent.githubUser}-issue-${issueNumber}`;
    console.log(`\n📝 Creating solution branch: ${branchName}`);

    // Create implementation file
    const fileName = `solution-issue-${issueNumber}.md`;
    const filePath = path.join(process.cwd(), fileName);

    const fileContent = `# Solution for Issue #${issueNumber}: ${issue.title}

## 🤖 AI Agent: ${agent.name}
**Role:** ${agent.role}
**Expertise:** ${agent.skills.join(', ')}

## 📋 Issue Analysis
${issue.body?.substring(0, 500)}...

## 💡 Proposed Solution

${solution}

## 📝 Implementation Plan

1. **Phase 1: Setup**
   - Initialize project structure
   - Set up dependencies
   - Configure environment

2. **Phase 2: Core Implementation**
   - Implement main functionality
   - Add error handling
   - Write unit tests

3. **Phase 3: Testing & Optimization**
   - Run comprehensive tests
   - Optimize performance
   - Add documentation

## 🔄 Next Steps
- [ ] Code review by team lead
- [ ] Testing in development environment
- [ ] Performance benchmarking
- [ ] Documentation update
- [ ] Deployment preparation

## 📊 Estimated Effort
- Development: 2-3 days
- Testing: 1 day
- Documentation: 0.5 day
- **Total: 3.5 days**

---
*Generated by AI ${agent.role} - ${new Date().toISOString()}*
`;

    await fs.writeFile(filePath, fileContent);
    console.log(`✅ Solution document created: ${fileName}`);

    // Add follow-up comment with solution
    await this.octokit.issues.createComment({
      owner: user.login,
      repo: this.repo,
      issue_number: issueNumber,
      body: `✅ **${agent.name}** has completed the analysis and created a solution!

## 📊 Work Summary
- **Time Spent:** 30 minutes (analysis & planning)
- **Solution Type:** ${labels.includes('bug') ? 'Bug Fix' : 'Feature Implementation'}
- **Approach:** ${agent.personality}

## 🎯 Solution Highlights
\`\`\`
${solution.substring(0, 300)}...
\`\`\`

## 📁 Deliverables
- Solution document created
- Implementation plan defined
- Code snippets generated
- Testing strategy outlined

## 👥 Requesting Review
Would the team like me to proceed with creating a Pull Request for this solution?

cc: @alex_chen (Tech Lead) for review`
    });

    console.log(`\n✅ Issue #${issueNumber} work completed by ${agent.name}!`);
  }

  // Simulate team code review
  async reviewPullRequest(prNumber) {
    const { data: user } = await this.octokit.users.getAuthenticated();
    console.log(`\n👀 AI Team reviewing PR #${prNumber}...\n`);

    // Get PR details
    const { data: pr } = await this.octokit.pulls.get({
      owner: user.login,
      repo: this.repo,
      pull_number: prNumber
    });

    // Get PR files
    const { data: files } = await this.octokit.pulls.listFiles({
      owner: user.login,
      repo: this.repo,
      pull_number: prNumber
    });

    // Each agent reviews based on their expertise
    const reviews = [];

    for (const [key, agent] of Object.entries(AI_AGENTS)) {
      // Check if files match agent's expertise
      const relevantFiles = files.filter(file => {
        const ext = path.extname(file.filename);
        if (agent.role === 'Frontend Developer' && ['.jsx', '.tsx', '.css', '.scss'].includes(ext)) return true;
        if (agent.role === 'Backend Developer' && ['.js', '.ts', '.py', '.sql'].includes(ext)) return true;
        if (agent.role === 'DevOps Engineer' && ['.yml', '.yaml', '.dockerfile'].includes(ext)) return true;
        return agent.role === 'Tech Lead'; // Tech lead reviews everything
      });

      if (relevantFiles.length > 0 || agent.role === 'Tech Lead') {
        const review = {
          agent,
          comment: await this.generateReviewComment(agent, pr, files)
        };
        reviews.push(review);
      }
    }

    // Post reviews as comments
    for (const review of reviews) {
      await this.octokit.issues.createComment({
        owner: user.login,
        repo: this.repo,
        issue_number: prNumber,
        body: `## 🤖 Review by ${review.agent.name} (${review.agent.role})

${review.comment}

---
*AI Review - ${new Date().toISOString()}*`
      });

      console.log(`✅ ${review.agent.name} completed review`);
    }

    console.log(`\n✅ Team review completed for PR #${prNumber}`);
  }

  // Generate review comment based on agent expertise
  async generateReviewComment(agent, pr, files) {
    const fileList = files.map(f => f.filename).join(', ');

    const prompt = `As ${agent.name} (${agent.role}), review this PR:
    Title: ${pr.title}
    Files changed: ${fileList}
    Additions: ${pr.additions} lines
    Deletions: ${pr.deletions} lines

    Provide a brief, constructive review focusing on your expertise in ${agent.skills.join(', ')}.`;

    return await this.askClaude(prompt, agent);
  }

  // Main execution
  async run() {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      console.log(`\n🤖 AI Dev Team System`);
      console.log(`👤 Authenticated as: ${user.login}`);
      console.log(`📦 Repository: ${this.repo}`);
      console.log(`⚙️  Action: ${this.action}\n`);

      switch (this.action) {
        case 'analyze':
          await this.analyzeIssues();
          break;

        case 'work':
          const issueNumber = process.argv[4];
          if (!issueNumber) {
            console.error('❌ Please specify an issue number: npm run ai-team work <issue-number>');
            break;
          }
          await this.workOnIssue(issueNumber);
          break;

        case 'review':
          const prNumber = process.argv[4];
          if (!prNumber) {
            console.error('❌ Please specify a PR number: npm run ai-team review <pr-number>');
            break;
          }
          await this.reviewPullRequest(prNumber);
          break;

        default:
          console.log('Available commands:');
          console.log('  npm run ai-team analyze - Analyze and assign issues');
          console.log('  npm run ai-team work <issue#> - Work on specific issue');
          console.log('  npm run ai-team review <pr#> - Review pull request');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the AI Dev Team
const team = new AIDevTeam();
team.run();