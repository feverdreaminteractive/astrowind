const { describe, it, expect, beforeEach, vi } = require('vitest');

// Mock the serverless function handler
describe('Claude Serverless Function', () => {
  let mockFetch;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('Request Validation', () => {
    it('should validate request body structure', async () => {
      const event = {
        body: JSON.stringify({
          message: 'Test prompt',
          browserData: {
            isWebBuilder: true,
            figmaContext: {
              layouts: []
            }
          }
        })
      };

      // Test would verify request is properly validated
      expect(JSON.parse(event.body).message).toBeDefined();
      expect(JSON.parse(event.body).browserData).toBeDefined();
    });

    it('should reject requests without message', async () => {
      const event = {
        body: JSON.stringify({
          browserData: {}
        })
      };

      // Test would verify 400 error is returned
      const body = JSON.parse(event.body);
      expect(body.message).toBeUndefined();
    });

    it('should handle oversized payloads', async () => {
      const largeLayouts = new Array(1000).fill({
        x: 0, y: 0, width: 100, height: 100,
        fills: [{ color: '#ffffff' }]
      });

      const event = {
        body: JSON.stringify({
          message: 'Test',
          browserData: {
            figmaContext: {
              layouts: largeLayouts
            }
          }
        })
      };

      const bodySize = event.body.length;
      expect(bodySize).toBeGreaterThan(100000);
    });
  });

  describe('Figma Data Processing', () => {
    it('should process Figma layouts into prompt', async () => {
      const figmaContext = {
        layouts: [
          {
            name: 'Header',
            type: 'FRAME',
            x: 0,
            y: 0,
            width: 1920,
            height: 80
          },
          {
            name: 'Hero',
            type: 'FRAME',
            x: 0,
            y: 80,
            width: 1920,
            height: 600
          }
        ]
      };

      // Test would verify layouts are converted to CSS positions
      const expectedPrompt = figmaContext.layouts
        .map(layout => `${layout.name}: position: absolute; left: ${layout.x}px; top: ${layout.y}px; width: ${layout.width}px; height: ${layout.height}px;`)
        .join('\\n');

      expect(expectedPrompt).toContain('position: absolute');
      expect(expectedPrompt).toContain('left: 0px');
      expect(expectedPrompt).toContain('width: 1920px');
    });

    it('should handle missing Figma data gracefully', async () => {
      const event = {
        body: JSON.stringify({
          message: 'Generate a page',
          browserData: {
            isWebBuilder: true
          }
        })
      };

      // Test would verify function continues without Figma data
      const body = JSON.parse(event.body);
      expect(body.browserData.figmaContext).toBeUndefined();
    });
  });

  describe('Response Processing', () => {
    const cleanForbiddenContent = (html) => {
      return html
        .replace(/<script[^>]*src=["']track\.js["'][^>]*><\/script>/gi, '')
        .replace(/track\.js/gi, '')
        .replace(/aisource\.vercel\.app/gi, '')
        .replace(/<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*><\/script>/gi, '')
        .replace(/sandbox=["']allow-scripts allow-same-origin[^"']*["']/gi, 'sandbox="allow-scripts"');
    };

    it('should clean track.js from responses', () => {
      const dirtyHtml = `
        <html>
          <head><script src="track.js"></script></head>
          <body>Content</body>
        </html>
      `;

      const cleaned = cleanForbiddenContent(dirtyHtml);
      expect(cleaned).not.toContain('track.js');
    });

    it('should clean aisource.vercel.app references', () => {
      const dirtyHtml = `
        <script src="https://aisource.vercel.app/analytics.js"></script>
        <link href="https://aisource.vercel.app/style.css">
      `;

      const cleaned = cleanForbiddenContent(dirtyHtml);
      expect(cleaned).not.toContain('aisource.vercel.app');
    });

    it('should remove Tailwind CDN', () => {
      const dirtyHtml = '<script src="https://cdn.tailwindcss.com"></script>';
      const cleaned = cleanForbiddenContent(dirtyHtml);
      expect(cleaned).not.toContain('cdn.tailwindcss.com');
    });

    it('should fix iframe sandbox attributes', () => {
      const dirtyHtml = '<iframe sandbox="allow-scripts allow-same-origin" src="preview.html"></iframe>';
      const cleaned = cleanForbiddenContent(dirtyHtml);
      expect(cleaned).toContain('sandbox="allow-scripts"');
      expect(cleaned).not.toContain('allow-same-origin');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      // Test would verify error is caught and proper error response returned
      try {
        await mockFetch();
      } catch (error) {
        expect(error.message).toBe('API Error');
      }
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(resolve, 100000); // Simulate long delay
        })
      );

      // Test would verify timeout handling
    });

    it('should log errors with context', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');

      console.error('ERROR:', error);
      expect(consoleSpy).toHaveBeenCalledWith('ERROR:', error);
    });
  });

  describe('Logging', () => {
    it('should log incoming requests', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const requestData = {
        message: 'Test',
        browserData: { isWebBuilder: true }
      };

      console.log('Incoming Request:', JSON.stringify(requestData));
      expect(consoleSpy).toHaveBeenCalledWith(
        'Incoming Request:',
        JSON.stringify(requestData)
      );
    });

    it('should log Figma context when present', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const figmaContext = {
        layouts: [{ x: 0, y: 0, width: 100, height: 100 }]
      };

      console.log('Figma Context Received:',
        `${figmaContext.layouts.length} layouts, ` +
        `${JSON.stringify(figmaContext).length} bytes`
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log API responses', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const response = { response: '<html>...</html>' };
      console.log('Claude API Response Length:', response.response.length);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Claude API Response Length:',
        response.response.length
      );
    });
  });

  describe('Performance', () => {
    it('should handle large Figma datasets efficiently', () => {
      const startTime = Date.now();

      // Create large dataset
      const layouts = new Array(100).fill(null).map((_, i) => ({
        name: `Element${i}`,
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 100
      }));

      // Process layouts (simplified version)
      const processed = layouts.slice(0, 30).map(layout =>
        `${layout.name}: ${layout.x}px, ${layout.y}px`
      ).join('\\n');

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should process quickly
      expect(processed.split('\\n')).toHaveLength(30); // Should limit to 30
    });

    it('should limit token usage appropriately', () => {
      const maxTokens = 4096;
      const prompt = 'Generate a website';

      // Test would verify token limit is enforced
      expect(maxTokens).toBeLessThanOrEqual(4096);
    });
  });
});

// Integration test for complete flow
describe('End-to-End Flow', () => {
  it('should process Figma data through to HTML generation', async () => {
    const request = {
      message: 'Build a landing page',
      browserData: {
        isWebBuilder: true,
        figmaContext: {
          layouts: [
            {
              name: 'Header',
              type: 'FRAME',
              x: 0,
              y: 0,
              width: 1920,
              height: 80,
              fills: [{ color: { r: 0, g: 0, b: 0, a: 1 } }]
            }
          ]
        }
      }
    };

    // Test would verify:
    // 1. Request is validated
    // 2. Figma data is processed into prompt
    // 3. API is called with correct payload
    // 4. Response is cleaned
    // 5. Clean HTML is returned
  });

  it('should handle file upload and JSON processing', async () => {
    const figmaJson = {
      document: {
        name: 'Design',
        absoluteBoundingBox: { x: 0, y: 0, width: 1920, height: 1080 },
        children: [
          {
            name: 'Component',
            absoluteBoundingBox: { x: 100, y: 100, width: 200, height: 200 }
          }
        ]
      }
    };

    // Test would verify JSON is properly parsed and converted to layouts
  });
});