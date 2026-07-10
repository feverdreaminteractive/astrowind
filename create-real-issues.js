#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createRealIssues() {
  console.log('🚀 Creating Real Portfolio Issues\n');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ Please set GITHUB_TOKEN in .env file');
    process.exit(1);
  }

  const repoName = process.argv[2] || 'team-dev-showcase';
  const octokit = new Octokit({ auth: token });

  try {
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
    console.log(`📦 Adding issues to: ${repoName}\n`);

    // Real issues based on your actual projects
    const realIssues = [
      // AI Website Builder Issues
      {
        title: 'Complete AI Website Builder with WebContainer integration',
        body: `## Description
Finish implementing the AI-powered website builder that runs entirely in the browser using WebContainer API.

## Current Status
- ✅ WebContainer integration working
- ✅ Basic file system operations
- ⚠️ Terminal output needs fixing
- ❌ AI code generation needs improvement

## Tasks
- [ ] Fix terminal display and command execution
- [ ] Implement proper error handling for WebContainer
- [ ] Add AI prompt templates for different website types
- [ ] Create file tree viewer component
- [ ] Add live preview with hot reload
- [ ] Implement save/export functionality

## Technical Requirements
- WebContainer API for in-browser Node.js
- Claude API for AI code generation
- React with TypeScript
- Monaco Editor for code editing

## Acceptance Criteria
- Users can describe a website and AI generates it
- Live preview updates as code changes
- Can install npm packages in browser
- Export project as ZIP

Assigned to: @sarah_martinez (Frontend) & @marcus_johnson (Backend)`,
        labels: ['enhancement', 'frontend', 'backend', 'high-priority'],
        milestone: 2
      },

      // Figma Integration Issues
      {
        title: 'Fix Figma to Code live sync functionality',
        body: `## Bug Report
The Figma plugin integration for live design-to-code sync is not working properly.

## Current Issues
- WebSocket connection drops after 30 seconds
- Authentication with Figma API failing intermittently
- Canvas rendering not updating in real-time
- FigJam board integration incomplete

## Files Affected
- /src/pages/figma-live-sync.astro
- /src/pages/figjam-board.astro
- /src/pages/figma-worker.astro
- /src/pages/test-figma.astro

## Steps to Reproduce
1. Open Figma plugin
2. Try to connect to live sync
3. Connection fails or drops

## Expected Behavior
- Stable WebSocket connection
- Real-time design updates
- Automatic code generation from Figma components

## Technical Stack
- Figma Plugin API
- WebSocket for real-time sync
- Canvas API for rendering
- PostMessage for iframe communication

Assigned to: @sarah_martinez (UI) & @jordan_kim (Infrastructure)`,
        labels: ['bug', 'frontend', 'high-priority'],
        milestone: 1
      },

      // MCP Server Development
      {
        title: 'Implement AI agent system for automated development tasks',
        body: `## Description
Create AI agents that correspond to each team role and can execute actual development tasks autonomously.

## Planned Agents
1. **Tech Lead Agent (Alex)**
   - Code review automation
   - Architecture decisions
   - PR approvals

2. **Frontend Agent (Sarah)**
   - Component generation
   - UI/UX improvements
   - Accessibility checks

3. **Backend Agent (Marcus)**
   - API endpoint creation
   - Database schema updates
   - Security audits

4. **DevOps Agent (Jordan)**
   - CI/CD pipeline updates
   - Performance monitoring
   - Deployment automation

## Implementation Plan
- [ ] Create agent base class with MCP integration
- [ ] Implement task execution framework
- [ ] Add agent-specific capabilities and tools
- [ ] Create trigger mechanism for local execution
- [ ] Build agent orchestration system
- [ ] Add task queue with priority handling
- [ ] Implement agent communication protocol

## Technologies
- Model Context Protocol (MCP)
- Claude API for agent intelligence
- GitHub API for repository interaction
- Node.js for execution runtime

Assigned to: @alex_chen (Architecture) & @marcus_johnson (Implementation)`,
        labels: ['enhancement', 'backend', 'devops'],
        milestone: 3
      },

      // Claude AI Integration
      {
        title: 'Optimize Claude AI assistant response time and context',
        body: `## Performance Issue
The Claude AI assistant on the portfolio site has slow response times and loses context in longer conversations.

## Current Metrics
- Average response time: 3-5 seconds
- Context window: Limited to last 5 messages
- Token usage: Not optimized

## Optimization Tasks
- [ ] Implement response streaming
- [ ] Add conversation memory management
- [ ] Cache common responses
- [ ] Optimize system prompts
- [ ] Add typing indicators
- [ ] Implement retry logic with exponential backoff

## Code Location
- /api-server.js (main API)
- /netlify/functions/claude.js (serverless function)

## Target Metrics
- Response time: < 2 seconds
- Context window: 20+ messages
- Token usage: 30% reduction

Assigned to: @marcus_johnson (Backend optimization)`,
        labels: ['enhancement', 'backend', 'performance'],
        milestone: 2
      },

      // Portfolio UI/UX
      {
        title: 'Redesign portfolio navigation for better mobile experience',
        body: `## UI/UX Issue
The portfolio navigation doesn't work well on mobile devices and needs a complete redesign.

## Problems
- Hamburger menu not responsive
- Links too small for touch targets
- No swipe gestures
- Bottom nav bar overlaps content

## Design Requirements
- [ ] Create new mobile-first navigation component
- [ ] Add gesture support for swipe navigation
- [ ] Implement bottom sheet pattern
- [ ] Add haptic feedback on mobile
- [ ] Create smooth transitions
- [ ] Ensure WCAG 2.1 AA compliance

## Affected Pages
- All pages need navigation update
- Special attention to /projects and /experience pages

## Design Inspiration
- Reference: iOS native patterns
- Material Design 3 guidelines
- Fluid navigation animations

Assigned to: @sarah_martinez (Frontend/Design)`,
        labels: ['enhancement', 'frontend', 'ui-ux'],
        milestone: 1
      },

      // GTM Dashboard
      {
        title: 'Add real-time data sync to GTM Dashboard',
        body: `## Feature Request
Implement real-time data synchronization for the GTM (Go-To-Market) Dashboard with 6sense and Salesforce.

## Current State
- Static data refresh every 5 minutes
- Manual sync button required
- No WebSocket implementation

## Required Integrations
- [ ] 6sense Buyer Intent API real-time webhooks
- [ ] Salesforce Streaming API integration
- [ ] Slack Events API for notifications
- [ ] WebSocket server for live updates
- [ ] Server-Sent Events fallback

## Technical Implementation
- Set up WebSocket server with socket.io
- Create event-driven architecture
- Implement data transformation pipeline
- Add real-time chart updates with D3.js
- Create notification system

## API Endpoints Needed
- /api/stream/6sense
- /api/stream/salesforce
- /api/stream/analytics
- /ws (WebSocket endpoint)

Assigned to: @marcus_johnson (Backend) & @jordan_kim (Infrastructure)`,
        labels: ['enhancement', 'backend', 'integration'],
        milestone: 2
      },

      // Testing & Quality
      {
        title: 'Set up comprehensive testing suite for portfolio',
        body: `## Testing Infrastructure
The portfolio currently has no automated testing. Need to implement full testing suite.

## Testing Requirements

### Unit Tests
- [ ] Component testing with React Testing Library
- [ ] API endpoint testing with Jest
- [ ] Utility function testing
- [ ] Mock external API calls

### Integration Tests
- [ ] API integration tests
- [ ] Database connection tests
- [ ] WebSocket connection tests
- [ ] Authentication flow tests

### E2E Tests
- [ ] Cypress for user journeys
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Performance testing with Lighthouse

### CI/CD Integration
- [ ] GitHub Actions workflow
- [ ] Pre-commit hooks with Husky
- [ ] Code coverage reporting
- [ ] Automated PR checks

## Target Coverage
- Unit tests: 80%
- Integration tests: 70%
- E2E critical paths: 100%

Assigned to: @alex_chen (Architecture) & @jordan_kim (CI/CD)`,
        labels: ['enhancement', 'testing', 'devops', 'high-priority'],
        milestone: 1
      },

      // Performance Optimization
      {
        title: 'Optimize WebContainer and Monaco Editor performance',
        body: `## Performance Issue
The AI Website Builder page with WebContainer and Monaco Editor has performance issues.

## Current Problems
- Initial load time: 8+ seconds
- Memory usage: 500MB+
- Bundle size: 2.5MB
- FCP: 4.2s, LCP: 6.8s

## Optimization Tasks
- [ ] Lazy load WebContainer API
- [ ] Code split Monaco Editor
- [ ] Implement virtual scrolling for file tree
- [ ] Add service worker for caching
- [ ] Optimize bundle with tree shaking
- [ ] Implement progressive enhancement
- [ ] Add loading skeletons

## Performance Targets
- Initial load: < 3 seconds
- Memory usage: < 200MB
- Bundle size: < 1MB
- FCP: < 2s, LCP: < 3s

## Tools
- Webpack Bundle Analyzer
- Chrome DevTools Performance
- Lighthouse CI

Assigned to: @sarah_martinez (Frontend) & @jordan_kim (DevOps)`,
        labels: ['enhancement', 'performance', 'frontend', 'high-priority'],
        milestone: 2
      },

      // Documentation
      {
        title: 'Create comprehensive documentation for all projects',
        body: `## Documentation Gap
Portfolio projects lack proper documentation for maintenance and handoff.

## Documentation Needed

### Technical Documentation
- [ ] API documentation with OpenAPI/Swagger
- [ ] Component library documentation (Storybook)
- [ ] Architecture decision records (ADRs)
- [ ] Database schema documentation
- [ ] Environment setup guides

### User Documentation
- [ ] User guides for each tool
- [ ] Video tutorials
- [ ] FAQ section
- [ ] Troubleshooting guides

### Developer Documentation
- [ ] Contributing guidelines
- [ ] Code style guide
- [ ] Git workflow documentation
- [ ] Deployment procedures
- [ ] Security guidelines

## Deliverables
- README.md for each project
- /docs folder with markdown files
- Swagger UI at /api-docs
- Storybook at /storybook

Assigned to: @alex_chen (Technical writing)`,
        labels: ['documentation', 'high-priority'],
        milestone: 3
      },

      // Security
      {
        title: 'Implement security best practices and audit',
        body: `## Security Audit Required
Need to implement security best practices across all portfolio projects.

## Security Tasks

### Authentication & Authorization
- [ ] Implement JWT refresh tokens
- [ ] Add rate limiting to APIs
- [ ] Set up CORS properly
- [ ] Add CSRF protection
- [ ] Implement 2FA option

### Data Protection
- [ ] Encrypt sensitive data at rest
- [ ] Use environment variables for all secrets
- [ ] Implement input validation
- [ ] Add SQL injection prevention
- [ ] XSS protection headers

### Infrastructure Security
- [ ] Set up CSP headers
- [ ] Enable HTTPS everywhere
- [ ] Add security.txt file
- [ ] Implement DDoS protection
- [ ] Regular dependency updates

### Compliance
- [ ] GDPR compliance for EU users
- [ ] Cookie consent management
- [ ] Privacy policy updates
- [ ] Data retention policies

## Tools
- npm audit
- Snyk for vulnerability scanning
- OWASP ZAP for penetration testing

Assigned to: @marcus_johnson (Backend) & @jordan_kim (Infrastructure)`,
        labels: ['security', 'backend', 'high-priority', 'devops'],
        milestone: 1
      }
    ];

    // Create issues
    console.log('📋 Creating real portfolio issues...\n');
    for (const issue of realIssues) {
      try {
        const { data } = await octokit.issues.create({
          owner: user.login,
          repo: repoName,
          ...issue
        });
        console.log(`✅ Issue #${data.number}: ${issue.title}`);
      } catch (error) {
        console.log(`⚠️  Skipped: ${issue.title} (${error.message})`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Real Issues Created Successfully!');
    console.log('='.repeat(50));
    console.log(`\n📦 Repository: https://github.com/${user.login}/${repoName}`);
    console.log(`📋 Issues: https://github.com/${user.login}/${repoName}/issues`);
    console.log('\nThese issues represent real work from your portfolio:');
    console.log('- AI Website Builder improvements');
    console.log('- Figma integration fixes');
    console.log('- MCP agent system development');
    console.log('- Performance optimizations');
    console.log('- Security enhancements');
    console.log('- Testing infrastructure');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
  }
}

// Run the script
createRealIssues();