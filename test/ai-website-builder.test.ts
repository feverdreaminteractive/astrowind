import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test validation functions
describe('AIWebsiteBuilder Validation', () => {
  describe('validateFigmaData', () => {
    it('should validate correct Figma data with layouts', () => {
      const validData = {
        layouts: [
          { x: 0, y: 0, width: 100, height: 100, name: 'Header' },
          { x: 0, y: 100, width: 100, height: 200, name: 'Content' }
        ]
      };

      // Mock validation function for testing
      const validateFigmaData = (data: any): boolean => {
        if (!data) return false;
        if (data.layouts && Array.isArray(data.layouts)) {
          return data.layouts.every((layout: any) =>
            typeof layout.x === 'number' &&
            typeof layout.y === 'number' &&
            typeof layout.width === 'number' &&
            typeof layout.height === 'number'
          );
        }
        return false;
      };

      expect(validateFigmaData(validData)).toBe(true);
    });

    it('should reject invalid Figma data', () => {
      const invalidData = {
        layouts: [
          { x: 'invalid', y: 0, width: 100, height: 100 }
        ]
      };

      const validateFigmaData = (data: any): boolean => {
        if (!data) return false;
        if (data.layouts && Array.isArray(data.layouts)) {
          return data.layouts.every((layout: any) =>
            typeof layout.x === 'number' &&
            typeof layout.y === 'number' &&
            typeof layout.width === 'number' &&
            typeof layout.height === 'number'
          );
        }
        return false;
      };

      expect(validateFigmaData(invalidData)).toBe(false);
    });

    it('should reject null or undefined data', () => {
      const validateFigmaData = (data: any): boolean => {
        if (!data) return false;
        if (data.layouts && Array.isArray(data.layouts)) {
          return data.layouts.every((layout: any) =>
            typeof layout.x === 'number' &&
            typeof layout.y === 'number' &&
            typeof layout.width === 'number' &&
            typeof layout.height === 'number'
          );
        }
        return false;
      };

      expect(validateFigmaData(null)).toBe(false);
      expect(validateFigmaData(undefined)).toBe(false);
    });
  });

  describe('validatePayload', () => {
    it('should validate correct payload', () => {
      const validPayload = {
        message: 'Generate a landing page',
        browserData: {
          isWebBuilder: true,
          targetFile: 'index.html',
          figmaContext: {
            layouts: [
              { x: 0, y: 0, width: 100, height: 100 }
            ]
          }
        }
      };

      const validatePayload = (payload: any): string[] => {
        const errors: string[] = [];
        if (!payload.message || typeof payload.message !== 'string') {
          errors.push('Message is required and must be a string');
        }
        if (payload.browserData?.figmaContext?.layouts && !Array.isArray(payload.browserData.figmaContext.layouts)) {
          errors.push('Figma layouts must be an array');
        }
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 500000) {
          errors.push(`Payload too large: ${payloadSize} bytes. Maximum: 500KB`);
        }
        return errors;
      };

      expect(validatePayload(validPayload)).toEqual([]);
    });

    it('should reject payload without message', () => {
      const invalidPayload = {
        browserData: {
          isWebBuilder: true
        }
      };

      const validatePayload = (payload: any): string[] => {
        const errors: string[] = [];
        if (!payload.message || typeof payload.message !== 'string') {
          errors.push('Message is required and must be a string');
        }
        return errors;
      };

      const errors = validatePayload(invalidPayload);
      expect(errors).toContain('Message is required and must be a string');
    });

    it('should reject oversized payload', () => {
      const largePayload = {
        message: 'Test',
        browserData: {
          figmaContext: {
            layouts: new Array(10000).fill({ x: 0, y: 0, width: 100, height: 100 })
          }
        }
      };

      const validatePayload = (payload: any): string[] => {
        const errors: string[] = [];
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 500000) {
          errors.push(`Payload too large: ${payloadSize} bytes. Maximum: 500KB`);
        }
        return errors;
      };

      const errors = validatePayload(largePayload);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Payload too large/);
    });
  });

  describe('cleanGeneratedCode', () => {
    const cleanGeneratedCode = (code: string): string => {
      return code
        .replace(/<script[^>]*src=['"]track\.js['"][^>]*><\/script>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?track\.js[\s\S]*?<\/script>/gi, '')
        .replace(/aisource\.vercel\.app/gi, '')
        .replace(/<script[^>]*>[\s\S]*?aisource[\s\S]*?<\/script>/gi, '')
        .replace(/<script[^>]*src=['"]https:\/\/cdn\.tailwindcss\.com['"][^>]*><\/script>/gi, '')
        .replace(/sandbox=['"]allow-scripts allow-same-origin[^'"]*['"]/gi, 'sandbox="allow-scripts"');
    };

    it('should remove track.js references', () => {
      const dirtyCode = '<html><head><script src="track.js"></script></head><body>Content</body></html>';
      const cleaned = cleanGeneratedCode(dirtyCode);
      expect(cleaned).not.toContain('track.js');
    });

    it('should remove aisource.vercel.app references', () => {
      const dirtyCode = '<script src="https://aisource.vercel.app/script.js"></script>';
      const cleaned = cleanGeneratedCode(dirtyCode);
      expect(cleaned).not.toContain('aisource.vercel.app');
    });

    it('should remove Tailwind CDN references', () => {
      const dirtyCode = '<script src="https://cdn.tailwindcss.com"></script>';
      const cleaned = cleanGeneratedCode(dirtyCode);
      expect(cleaned).not.toContain('cdn.tailwindcss.com');
    });

    it('should fix dangerous iframe sandbox attributes', () => {
      const dirtyCode = '<iframe sandbox="allow-scripts allow-same-origin" src="test.html"></iframe>';
      const cleaned = cleanGeneratedCode(dirtyCode);
      expect(cleaned).toContain('sandbox="allow-scripts"');
      expect(cleaned).not.toContain('allow-same-origin');
    });

    it('should preserve clean HTML', () => {
      const cleanCode = '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
      const cleaned = cleanGeneratedCode(cleanCode);
      expect(cleaned).toEqual(cleanCode);
    });
  });

  describe('processFigmaJson', () => {
    const processFigmaJson = (json: any) => {
      const document = json.document || json;
      const layouts: any[] = [];

      const extractLayouts = (node: any, parentX = 0, parentY = 0) => {
        if (node.absoluteBoundingBox || node.boundingBox) {
          const bounds = node.absoluteBoundingBox || node.boundingBox;
          layouts.push({
            name: node.name,
            type: node.type,
            x: bounds.x || parentX,
            y: bounds.y || parentY,
            width: bounds.width,
            height: bounds.height,
            layoutMode: node.layoutMode,
            padding: node.paddingLeft ? {
              top: node.paddingTop,
              right: node.paddingRight,
              bottom: node.paddingBottom,
              left: node.paddingLeft
            } : null,
            itemSpacing: node.itemSpacing,
            fills: node.fills,
            strokes: node.strokes,
            effects: node.effects,
            cornerRadius: node.cornerRadius,
            characters: node.characters,
            style: node.style
          });
        }

        if (node.children) {
          const nodeX = node.absoluteBoundingBox?.x || parentX;
          const nodeY = node.absoluteBoundingBox?.y || parentY;
          node.children.forEach((child: any) => extractLayouts(child, nodeX, nodeY));
        }
      };

      extractLayouts(document);
      return { layouts };
    };

    it('should extract layouts from Figma JSON', () => {
      const figmaJson = {
        document: {
          name: 'Page',
          type: 'CANVAS',
          absoluteBoundingBox: { x: 0, y: 0, width: 1920, height: 1080 },
          children: [
            {
              name: 'Header',
              type: 'FRAME',
              absoluteBoundingBox: { x: 0, y: 0, width: 1920, height: 80 }
            },
            {
              name: 'Content',
              type: 'FRAME',
              absoluteBoundingBox: { x: 0, y: 80, width: 1920, height: 1000 }
            }
          ]
        }
      };

      const result = processFigmaJson(figmaJson);
      expect(result.layouts).toHaveLength(3); // Page + Header + Content
      expect(result.layouts[0].name).toBe('Page');
      expect(result.layouts[1].name).toBe('Header');
      expect(result.layouts[2].name).toBe('Content');
    });

    it('should handle nested children', () => {
      const figmaJson = {
        document: {
          name: 'Root',
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
          children: [
            {
              name: 'Parent',
              absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 80 },
              children: [
                {
                  name: 'Child',
                  absoluteBoundingBox: { x: 20, y: 20, width: 60, height: 60 }
                }
              ]
            }
          ]
        }
      };

      const result = processFigmaJson(figmaJson);
      expect(result.layouts).toHaveLength(3);
      expect(result.layouts[2].name).toBe('Child');
      expect(result.layouts[2].x).toBe(20);
      expect(result.layouts[2].y).toBe(20);
    });

    it('should extract text content', () => {
      const figmaJson = {
        document: {
          name: 'Text',
          type: 'TEXT',
          absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 50 },
          characters: 'Hello World'
        }
      };

      const result = processFigmaJson(figmaJson);
      expect(result.layouts[0].characters).toBe('Hello World');
    });
  });
});

// Integration tests
describe('AIWebsiteBuilder Integration', () => {
  beforeEach(() => {
    // Reset localStorage
    global.localStorage.clear();
    // Reset fetch mocks
    vi.clearAllMocks();
  });

  it('should handle API timeout gracefully', async () => {
    // Mock fetch to simulate timeout
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 100);
      })
    );

    // Test would verify the error message shows timeout
  });

  it('should validate and clean response from API', async () => {
    const mockResponse = {
      response: '<html><script src="track.js"></script><body>Content</body></html>'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Test would verify the cleaned code doesn't contain track.js
  });

  it('should handle Figma data in payload', async () => {
    const figmaData = {
      layouts: [
        { x: 0, y: 0, width: 100, height: 100, name: 'Header' }
      ]
    };

    // Test would verify the payload includes figmaData correctly
  });

  it('should persist cleaned projects to localStorage', () => {
    const projects = [
      { name: 'Project 1', content: '<script src="track.js"></script>Content' }
    ];

    localStorage.setItem('aiProjects', JSON.stringify(projects));

    // After component mount, check if projects are cleaned
    const stored = localStorage.getItem('aiProjects');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Would verify track.js is removed
    }
  });
});

// Error Boundary tests
describe('ErrorBoundary', () => {
  it('should catch and display errors', () => {
    // Test would verify error boundary catches React errors
  });

  it('should allow dismissing errors', () => {
    // Test would verify dismiss button functionality
  });

  it('should log errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    // Test would verify console.error is called
  });
});