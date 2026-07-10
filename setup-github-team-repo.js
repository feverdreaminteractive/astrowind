#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Team member personas with their commit styles
const TEAM_MEMBERS = {
  alex_chen: {
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    role: 'Tech Lead',
    commitStyle: 'feat:', // Uses conventional commits
    reviewStyle: 'thorough'
  },
  sarah_martinez: {
    name: 'Sarah Martinez',
    email: 'sarah.martinez@example.com',
    role: 'Frontend Developer',
    commitStyle: 'fix:',
    reviewStyle: 'ui-focused'
  },
  marcus_johnson: {
    name: 'Marcus Johnson',
    email: 'marcus.johnson@example.com',
    role: 'Backend Developer',
    commitStyle: 'chore:',
    reviewStyle: 'performance'
  },
  jordan_kim: {
    name: 'Jordan Kim',
    email: 'jordan.kim@example.com',
    role: 'DevOps Engineer',
    commitStyle: 'ci:',
    reviewStyle: 'infrastructure'
  }
};

async function setupGitHubRepo() {
  console.log('🚀 GitHub Team Repository Setup\n');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ Please set GITHUB_TOKEN environment variable');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Get current user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}\n`);

    // Ask for repo name
    const repoName = await question('Enter repository name (e.g., team-project-showcase): ');

    // Create repository
    console.log('\n📦 Creating repository...');
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'A showcase of team collaboration, project management, and development workflow',
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
      auto_init: true
    });
    console.log(`✅ Repository created: ${repo.html_url}`);

    // Create labels for issue tracking
    console.log('\n🏷️  Creating labels...');
    const labels = [
      { name: 'bug', color: 'd73a4a', description: 'Something isn\'t working' },
      { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
      { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
      { name: 'frontend', color: 'ffd93d', description: 'Frontend related tasks' },
      { name: 'backend', color: '6f42c1', description: 'Backend related tasks' },
      { name: 'devops', color: '0e8a16', description: 'DevOps and infrastructure' },
      { name: 'high-priority', color: 'b60205', description: 'High priority issue' },
      { name: 'in-progress', color: 'fbca04', description: 'Work in progress' },
      { name: 'ready-for-review', color: '0052cc', description: 'Ready for code review' },
      { name: 'blocked', color: 'e99695', description: 'Blocked by dependencies' }
    ];

    for (const label of labels) {
      await octokit.issues.createLabel({
        owner: user.login,
        repo: repoName,
        ...label
      });
      console.log(`  ✅ Label created: ${label.name}`);
    }

    // Create milestones
    console.log('\n📍 Creating milestones...');
    const milestones = [
      {
        title: 'Sprint 1 - Foundation',
        description: 'Set up basic infrastructure and core features',
        due_on: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Sprint 2 - Feature Development',
        description: 'Implement main application features',
        due_on: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Sprint 3 - Polish & Deploy',
        description: 'Final touches, testing, and deployment',
        due_on: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const milestone of milestones) {
      const { data } = await octokit.issues.createMilestone({
        owner: user.login,
        repo: repoName,
        ...milestone
      });
      console.log(`  ✅ Milestone created: ${milestone.title}`);
    }

    // Create realistic issues
    console.log('\n📋 Creating issues...');
    const issues = [
      {
        title: 'Set up project structure and initial configuration',
        body: `## Description
We need to establish the project foundation with proper folder structure and configuration files.

## Tasks
- [ ] Create src directory structure
- [ ] Set up TypeScript configuration
- [ ] Configure ESLint and Prettier
- [ ] Add .gitignore and .env.example

## Acceptance Criteria
- Project builds without errors
- Linting passes
- Basic folder structure is in place

Assigned to: @alex_chen`,
        labels: ['enhancement', 'high-priority'],
        milestone: 1,
        assignee: user.login
      },
      {
        title: 'Implement user authentication system',
        body: `## Description
Build a secure authentication system with login, logout, and session management.

## Technical Requirements
- JWT token implementation
- Secure password hashing (bcrypt)
- Session management
- Password reset functionality

## API Endpoints
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/reset-password

Assigned to: @marcus_johnson`,
        labels: ['enhancement', 'backend', 'high-priority'],
        milestone: 1
      },
      {
        title: 'Design and implement responsive navigation component',
        body: `## Description
Create a responsive navigation bar that works across all device sizes.

## Requirements
- Mobile-first design
- Hamburger menu for mobile
- Smooth transitions
- Accessibility compliant (ARIA labels)
- Dark mode support

## Design Specs
- Follow Material Design guidelines
- Support for nested menus
- Active state indicators

Assigned to: @sarah_martinez`,
        labels: ['enhancement', 'frontend'],
        milestone: 1
      },
      {
        title: 'Set up CI/CD pipeline with GitHub Actions',
        body: `## Description
Implement automated testing and deployment pipeline.

## Pipeline Stages
1. **Build Stage**
   - Install dependencies
   - Run build process

2. **Test Stage**
   - Unit tests
   - Integration tests
   - Code coverage report

3. **Deploy Stage**
   - Deploy to staging (on PR)
   - Deploy to production (on main merge)

## Requirements
- Automated testing on every PR
- Code coverage > 80%
- Automatic deployment to staging
- Manual approval for production

Assigned to: @jordan_kim`,
        labels: ['enhancement', 'devops'],
        milestone: 1
      },
      {
        title: 'Implement data validation middleware',
        body: `## Description
Add comprehensive input validation for all API endpoints.

## Scope
- Request body validation
- Query parameter validation
- Custom error messages
- Type checking

Assigned to: @marcus_johnson`,
        labels: ['enhancement', 'backend', 'in-progress'],
        milestone: 2
      },
      {
        title: 'Create dashboard UI with data visualizations',
        body: `## Description
Build an interactive dashboard with charts and metrics.

## Components
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Real-time data updates
- Export functionality

## Libraries
- Chart.js or D3.js
- Consider performance for large datasets

Assigned to: @sarah_martinez`,
        labels: ['enhancement', 'frontend', 'in-progress'],
        milestone: 2
      },
      {
        title: 'Optimize database queries for performance',
        body: `## Issue
Current database queries are slow with large datasets.

## Investigation
- Profile slow queries
- Add appropriate indexes
- Consider query caching
- Implement pagination

## Metrics
- Target: < 100ms response time for 95% of queries
- Current: ~500ms average

Assigned to: @marcus_johnson`,
        labels: ['bug', 'backend', 'high-priority'],
        milestone: 2
      },
      {
        title: 'Add comprehensive error logging and monitoring',
        body: `## Description
Implement centralized error logging and monitoring system.

## Requirements
- Structured logging (JSON format)
- Error tracking (Sentry integration)
- Performance monitoring
- Custom alerts for critical errors
- Log rotation and retention policies

## Tools
- Winston for logging
- Sentry for error tracking
- CloudWatch/DataDog for metrics

Assigned to: @jordan_kim`,
        labels: ['enhancement', 'devops', 'ready-for-review'],
        milestone: 2
      },
      {
        title: 'Improve mobile responsiveness of forms',
        body: `## Bug Report
Forms are not displaying correctly on mobile devices.

## Steps to Reproduce
1. Open application on mobile device
2. Navigate to any form
3. Try to fill in fields

## Expected Behavior
Forms should be fully responsive and easy to use on mobile

## Current Behavior
- Fields are cut off
- Labels overlap inputs
- Submit button not visible without scrolling

Assigned to: @sarah_martinez`,
        labels: ['bug', 'frontend', 'high-priority'],
        milestone: 2
      },
      {
        title: 'Write comprehensive API documentation',
        body: `## Description
Document all API endpoints with examples and schemas.

## Documentation Requirements
- OpenAPI/Swagger specification
- Request/response examples
- Error codes and messages
- Authentication requirements
- Rate limiting information

## Deliverables
- Swagger UI setup
- Postman collection
- README with quick start guide

Assigned to: @alex_chen`,
        labels: ['documentation', 'ready-for-review'],
        milestone: 3
      }
    ];

    const createdIssues = [];
    for (const issue of issues) {
      const { data } = await octokit.issues.create({
        owner: user.login,
        repo: repoName,
        ...issue
      });
      createdIssues.push(data);
      console.log(`  ✅ Issue #${data.number}: ${issue.title}`);
    }

    // Create a project board
    console.log('\n📊 Creating project board...');
    const { data: project } = await octokit.projects.createForRepo({
      owner: user.login,
      repo: repoName,
      name: 'Development Sprint Board',
      body: 'Kanban board for tracking development progress'
    });
    console.log(`✅ Project board created: ${project.html_url}`);

    // Create columns
    console.log('  Creating columns...');
    const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
    for (const columnName of columns) {
      await octokit.projects.createColumn({
        project_id: project.id,
        name: columnName
      });
      console.log(`    ✅ Column: ${columnName}`);
    }

    // Create sample README with team info
    console.log('\n📝 Creating README with team information...');
    const readmeContent = `# ${repoName}

## 🚀 Project Overview
A showcase of team collaboration, project management, and development workflow.

## 👥 Team Members

### ${TEAM_MEMBERS.alex_chen.name} - ${TEAM_MEMBERS.alex_chen.role}
- Focus: Architecture, Code Quality, TypeScript
- Responsibilities: Code reviews, technical decisions, mentoring

### ${TEAM_MEMBERS.sarah_martinez.name} - ${TEAM_MEMBERS.sarah_martinez.role}
- Focus: UI/UX, React, Accessibility
- Responsibilities: Component design, responsive layouts, user experience

### ${TEAM_MEMBERS.marcus_johnson.name} - ${TEAM_MEMBERS.marcus_johnson.role}
- Focus: APIs, Database, Security
- Responsibilities: Server architecture, data modeling, authentication

### ${TEAM_MEMBERS.jordan_kim.name} - ${TEAM_MEMBERS.jordan_kim.role}
- Focus: CI/CD, Cloud Infrastructure, Monitoring
- Responsibilities: Deployment pipelines, infrastructure as code, performance

## 📊 Project Management

### Current Sprint
- **Sprint 1**: Foundation (2 weeks)
- **Sprint 2**: Feature Development (2 weeks)
- **Sprint 3**: Polish & Deploy (2 weeks)

### Velocity Tracking
- Average story points per sprint: 21
- Team capacity: 4 developers × 40 hours/week

### Key Metrics
- Code Coverage: 85%
- Build Success Rate: 98%
- Average PR Review Time: 4 hours
- Bug Resolution Time: < 24 hours

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **DevOps**: Docker, GitHub Actions, AWS
- **Testing**: Jest, Cypress, Supertest

## 📈 Development Workflow
1. Issues created and prioritized in backlog
2. Sprint planning every 2 weeks
3. Daily standups (async via GitHub discussions)
4. Code reviews required for all PRs
5. Automated CI/CD on merge to main
6. Retrospectives at sprint end

## 🏆 Achievements
- ✅ 100% automated test coverage
- ✅ Zero security vulnerabilities
- ✅ Sub-second page load times
- ✅ Fully accessible (WCAG 2.1 AA compliant)

## 📝 Documentation
- [API Documentation](./docs/api.md)
- [Architecture Decisions](./docs/architecture.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Code Style Guide](./docs/style-guide.md)

---
*This repository demonstrates professional team collaboration and modern development practices.*`;

    await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: repoName,
      path: 'README.md',
      message: 'docs: Add comprehensive team README',
      content: Buffer.from(readmeContent).toString('base64'),
      branch: 'main'
    });
    console.log('✅ README created with team information');

    // Create a sample PR
    console.log('\n🔀 Creating sample pull request...');

    // First create a branch
    const { data: mainRef } = await octokit.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main'
    });

    await octokit.git.createRef({
      owner: user.login,
      repo: repoName,
      ref: 'refs/heads/feature/add-user-api',
      sha: mainRef.object.sha
    });

    // Add a file to the branch
    const apiContent = `// User API Controller
// Author: Marcus Johnson

import express from 'express';
import { validateUser } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /api/users
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.findAll({
      limit: req.query.limit || 10,
      offset: req.query.offset || 0
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/users', validateUser, async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user' });
  }
});

export default router;`;

    await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: repoName,
      path: 'src/controllers/userController.js',
      message: 'feat: Add user API endpoints',
      content: Buffer.from(apiContent).toString('base64'),
      branch: 'feature/add-user-api'
    });

    // Create the PR
    const { data: pr } = await octokit.pulls.create({
      owner: user.login,
      repo: repoName,
      title: 'feat: Add user API endpoints',
      body: `## Description
Implements user CRUD operations with proper validation and authentication.

## Changes
- Added GET /api/users endpoint with pagination
- Added POST /api/users endpoint with validation
- Integrated authentication middleware
- Added error handling

## Testing
- [x] Unit tests added
- [x] Manual testing completed
- [x] API documentation updated

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] No new warnings introduced
- [x] Tests pass locally

Resolves #2`,
      head: 'feature/add-user-api',
      base: 'main'
    });
    console.log(`✅ Pull request created: ${pr.html_url}`);

    console.log('\n' + '='.repeat(50));
    console.log('✨ Setup Complete!');
    console.log('='.repeat(50));
    console.log(`\n📦 Repository: ${repo.html_url}`);
    console.log(`📊 Project Board: ${project.html_url}`);
    console.log(`🔀 Sample PR: ${pr.html_url}`);
    console.log(`📋 Issues: ${repo.html_url}/issues`);
    console.log('\nNext steps:');
    console.log('1. Visit your repository to see the team structure');
    console.log('2. Check the Issues tab for the backlog');
    console.log('3. View the Projects tab for the sprint board');
    console.log('4. Review the sample PR for team collaboration example');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    rl.close();
  }
}

// Run the setup
setupGitHubRepo();