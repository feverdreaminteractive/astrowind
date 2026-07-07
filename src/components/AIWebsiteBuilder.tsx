import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  path: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {this.state.error?.message || 'Something went wrong'}</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Validation functions
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

const validatePayload = (payload: any): string[] => {
  const errors: string[] = [];

  if (!payload.message || typeof payload.message !== 'string') {
    errors.push('Message is required and must be a string');
  }

  if (payload.browserData) {
    if (payload.browserData.figmaContext) {
      const context = payload.browserData.figmaContext;
      if (context.layouts && !Array.isArray(context.layouts)) {
        errors.push('Figma layouts must be an array');
      }
      // Check payload size (Netlify has limits)
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 500000) { // 500KB limit
        errors.push(`Payload too large: ${payloadSize} bytes. Maximum: 500KB`);
      }
    }
  }

  return errors;
};

const AIWebsiteBuilderInner: React.FC = () => {
  // Clean up any stored projects with problematic code on mount
  useEffect(() => {
    const stored = localStorage.getItem('aiProjects');
    if (stored) {
      try {
        const projects = JSON.parse(stored);
        const cleanedProjects = projects.map((project: any) => ({
          ...project,
          content: project.content ? cleanGeneratedCode(project.content) : project.content
        }));
        localStorage.setItem('aiProjects', JSON.stringify(cleanedProjects));
      } catch (e) {
        // Invalid stored data, ignore
      }
    }
  }, []);

  const [files, setFiles] = useState<FileNode[]>([
    {
      name: 'index.html',
      type: 'file',
      path: '/index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
            padding-top: 100px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your AI-Built Website</h1>
        <p>Start building something amazing with AI assistance!</p>
    </div>
</body>
</html>`
    }
  ]);

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(files[0]);
  const [code, setCode] = useState(files[0]?.content || '');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [figmaToken, setFigmaToken] = useState('');
  const [showFigmaSettings, setShowFigmaSettings] = useState(false);
  const [figmaData, setFigmaData] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [figmaJson, setFigmaJson] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean dangerous code patterns
  const cleanGeneratedCode = (code: string): string => {
    return code
      // Remove track.js references
      .replace(/<script[^>]*src=['"]track\.js['"][^>]*><\/script>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?track\.js[\s\S]*?<\/script>/gi, '')
      // Remove aisource.vercel.app
      .replace(/aisource\.vercel\.app/gi, '')
      .replace(/<script[^>]*>[\s\S]*?aisource[\s\S]*?<\/script>/gi, '')
      // Remove Tailwind CDN
      .replace(/<script[^>]*src=['"]https:\/\/cdn\.tailwindcss\.com['"][^>]*><\/script>/gi, '')
      // Fix dangerous iframe sandbox
      .replace(/sandbox=['"]allow-scripts allow-same-origin[^'"]*['"]/gi, 'sandbox="allow-scripts"');
  };

  // Update preview when code changes
  useEffect(() => {
    if (iframeRef.current && selectedFile?.name.endsWith('.html')) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const cleanedCode = cleanGeneratedCode(code);
        iframeDoc.open();
        iframeDoc.write(cleanedCode);
        iframeDoc.close();
      }
    }
  }, [code, selectedFile]);

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (selectedFile) {
      setFiles(files.map(file =>
        file.path === selectedFile.path
          ? { ...file, content: newCode }
          : file
      ));
    }
  };

  // Handle file upload (images or JSON)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      // Handle image upload
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      // Handle JSON upload (Figma export)
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setFigmaJson(json);
          // Process the Figma JSON to extract detailed design info
          const processed = processFigmaJson(json);
          setFigmaData(processed);
        } catch (error) {
          console.error('Invalid JSON file:', error);
          alert('Invalid JSON file. Please upload a valid Figma export.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Process Figma JSON export to extract comprehensive design data
  const processFigmaJson = (json: any) => {
    const document = json.document || json;

    // Extract all absolute positions and layouts
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
          // Layout properties
          layoutMode: node.layoutMode,
          padding: node.paddingLeft ? {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft
          } : null,
          itemSpacing: node.itemSpacing,
          // Style properties
          fills: node.fills,
          strokes: node.strokes,
          effects: node.effects,
          cornerRadius: node.cornerRadius,
          // Text properties
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

    // Group layouts by vertical position to identify sections
    const sections = layouts.reduce((acc: any[], layout) => {
      const sectionIndex = acc.findIndex(s =>
        Math.abs(s.y - layout.y) < 50 // Group elements within 50px vertically
      );

      if (sectionIndex === -1) {
        acc.push({ y: layout.y, elements: [layout] });
      } else {
        acc[sectionIndex].elements.push(layout);
      }

      return acc;
    }, []).sort((a, b) => a.y - b.y);

    return {
      name: document.name,
      type: document.type,
      dimensions: {
        width: document.absoluteBoundingBox?.width,
        height: document.absoluteBoundingBox?.height
      },
      layouts: layouts,
      sections: sections,
      raw: json // Keep raw data for detailed reference
    };
  };

  // Extract Figma design data from URL using server proxy
  const extractFigmaData = async (figmaUrl: string) => {
    try {
      // Use the server-side proxy to fetch Figma data (no token needed)
      const response = await fetch(`/api/figma-proxy?url=${encodeURIComponent(figmaUrl)}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Figma file');
      }

      const data = await response.json();
      console.log('Fetched Figma data via proxy:', data);
      return data;
    } catch (error) {
      console.error('Figma fetch error:', error);
      // Fallback to direct API if proxy fails
      const fileMatch = figmaUrl.match(/figma\.com\/(?:file|design)\/([^/?\s]+)/);
      if (!fileMatch) {
        throw new Error('Invalid Figma URL');
      }

      const fileKey = fileMatch[1];
      const token = figmaToken || localStorage.getItem('figmaToken');

      if (!token) {
        setShowFigmaSettings(true);
        throw new Error('Server proxy unavailable. Please enter your Figma token.');
      }

      // Direct API call fallback
      const figmaApiUrl = `https://api.figma.com/v1/files/${fileKey}`;
      const directResponse = await fetch(figmaApiUrl, {
        headers: { 'X-Figma-Token': token }
      });

      if (!directResponse.ok) {
        throw new Error('Failed to fetch Figma file');
      }

      const directData = await directResponse.json();
      return directData;
    }
  };

  // Extract meaningful design context from Figma data
  const extractDesignContext = (figmaData: any, nodeId: string | null) => {
    const document = nodeId ?
      findNodeById(figmaData.document, nodeId) :
      figmaData.document;

    if (!document) return null;

    // Extract colors
    const colors = new Set<string>();
    const extractColors = (node: any) => {
      if (node.fills) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const rgb = `rgb(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)})`;
            colors.add(rgb);
          }
        });
      }
      if (node.children) {
        node.children.forEach((child: any) => extractColors(child));
      }
    };
    extractColors(document);

    // Extract typography
    const typography: any[] = [];
    const extractTypography = (node: any) => {
      if (node.type === 'TEXT' && node.style) {
        typography.push({
          fontSize: node.style.fontSize,
          fontWeight: node.style.fontWeight,
          fontFamily: node.style.fontFamily
        });
      }
      if (node.children) {
        node.children.forEach((child: any) => extractTypography(child));
      }
    };
    extractTypography(document);

    // Build structure description
    const buildStructure = (node: any, level = 0): string => {
      const indent = '  '.repeat(level);
      let desc = `${indent}${node.name} (${node.type})`;
      if (node.type === 'TEXT' && node.characters) {
        desc += `: "${node.characters.substring(0, 30)}..."`;
      }
      if (node.children) {
        desc += '\n' + node.children.map((child: any) =>
          buildStructure(child, level + 1)
        ).join('\n');
      }
      return desc;
    };

    return {
      name: document.name,
      type: document.type,
      colors: Array.from(colors),
      typography: typography,
      structure: buildStructure(document),
      dimensions: {
        width: document.absoluteBoundingBox?.width,
        height: document.absoluteBoundingBox?.height
      }
    };
  };

  // Helper: Find node by ID
  const findNodeById = (node: any, nodeId: string): any => {
    if (node.id === nodeId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  // Generate code using AI with chunking support
  const generateCode = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    // Check if we need chunked generation (for Figma data)
    const needsChunking = figmaData?.layouts?.length > 20 || figmaJson?.layouts?.length > 20;

    // Check if this is a Figma URL and extract data
    let figmaContext = null;
    if (prompt.includes('figma.com')) {
      try {
        figmaContext = await extractFigmaData(prompt);
      } catch (error) {
        console.error('Figma extraction failed:', error);
        // Continue without Figma data
      }
    }

    try {
      // DEBUG: Log what we're about to send
      console.log('=== CLIENT SIDE DEBUG ===');
      console.log('Prompt:', prompt);
      console.log('Has uploaded image:', !!uploadedImage);
      console.log('Has Figma JSON:', !!figmaJson);
      console.log('Has Figma Data:', !!figmaData);
      console.log('Has Figma Context:', !!figmaContext);

      if (figmaData) {
        console.log('Figma Data Details:', {
          hasLayouts: !!figmaData.layouts,
          layoutCount: figmaData.layouts?.length,
          hasSections: !!figmaData.sections,
          sectionCount: figmaData.sections?.length,
          dimensions: figmaData.dimensions,
          firstLayout: figmaData.layouts?.[0]
        });
      }

      // Prepare message with design context
      let enhancedPrompt = prompt;

      // If we have an uploaded image, describe it
      if (uploadedImage) {
        enhancedPrompt = `Create a pixel-perfect HTML implementation of this design screenshot.
The design shows: ${prompt}

IMPORTANT: Match the exact layout, colors, spacing, and typography from the screenshot.
Build a complete, working HTML file with inline CSS.`;
      }
      // If we have Figma JSON with detailed layouts
      else if (figmaJson && figmaData?.layouts) {
        const layouts = figmaData.layouts.slice(0, 20); // First 20 elements
        const sections = figmaData.sections.map((s: any) =>
          `Section at Y:${s.y} with ${s.elements.length} elements`
        ).join('\n');

        enhancedPrompt = `${prompt}

FIGMA DESIGN - EXACT LAYOUT DATA:
Dimensions: ${figmaData.dimensions?.width}x${figmaData.dimensions?.height}px

SECTIONS (top to bottom):
${sections}

KEY ELEMENTS WITH POSITIONS:
${layouts.map((l: any) =>
  `- ${l.name} (${l.type}): ${l.width}x${l.height}px at (${l.x}, ${l.y})${l.characters ? ' - Text: "' + l.characters.substring(0, 30) + '"' : ''}`
).join('\n')}

Build an EXACT replica matching these positions and dimensions.`;
      }
      // If we have basic Figma API data
      else if (figmaContext) {
        enhancedPrompt = `${prompt}\n\nEXTRACTED FIGMA DESIGN DATA:\nColors: ${figmaContext.colors?.slice(0, 10).join(', ')}\nTypography: ${JSON.stringify(figmaContext.typography?.slice(0, 5))}\nDimensions: ${figmaContext.dimensions?.width}x${figmaContext.dimensions?.height}\nStructure Preview:\n${figmaContext.structure?.substring(0, 500)}`;
      }

      // For large Figma designs, break into chunks
      if (needsChunking && (figmaData || figmaJson)) {
        const layouts = (figmaData?.layouts || figmaJson?.layouts || []);
        const chunksOf = 15; // Process 15 elements at a time
        let fullHTML = '';
        let fullCSS = '';

        // Group layouts by Y position (sections)
        const sections: any[] = [];
        layouts.forEach((layout: any) => {
          const sectionIndex = sections.findIndex(s =>
            Math.abs(s.startY - layout.y) < 100
          );
          if (sectionIndex === -1) {
            sections.push({ startY: layout.y, layouts: [layout] });
          } else {
            sections[sectionIndex].layouts.push(layout);
          }
        });

        // Sort sections by Y position
        sections.sort((a, b) => a.startY - b.startY);

        console.log(`Processing ${sections.length} sections...`);

        // Generate each section
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const isFirst = i === 0;
          const isLast = i === sections.length - 1;

          const sectionPrompt = `Generate HTML for section ${i + 1} of ${sections.length}.
          ${isFirst ? 'This is the HEADER/TOP section. Include <!DOCTYPE html> and opening tags.' : ''}
          ${isLast ? 'This is the FOOTER/BOTTOM section. Include closing </body></html> tags.' : ''}

          Section elements (use exact positions):
          ${section.layouts.map((l: any) =>
            `${l.name}: ${l.width}x${l.height}px at (${l.x}, ${l.y})`
          ).join('\n')}

          ${!isFirst && !isLast ? 'Output ONLY the HTML for this section, no DOCTYPE or body tags.' : ''}`;

          const sectionPayload = {
            message: sectionPrompt,
            browserData: {
              isWebBuilder: true,
              targetFile: 'section.html',
              existingContent: '',
              chunkIndex: i,
              totalChunks: sections.length,
              figmaContext: {
                layouts: section.layouts,
                colors: figmaData?.colors || figmaJson?.colors,
                dimensions: figmaData?.dimensions || { width: 1920, height: 1080 }
              }
            }
          };

          console.log(`Generating section ${i + 1}/${sections.length}...`);
          setGenerationProgress(`Generating section ${i + 1} of ${sections.length}...`);

          const response = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sectionPayload),
          });

          if (!response.ok) throw new Error(`Section ${i + 1} failed`);

          const data = await response.json();
          const sectionHTML = data.response || data.message;

          if (isFirst) {
            fullHTML = sectionHTML;
          } else if (isLast) {
            // Extract body content and append
            const bodyMatch = fullHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (bodyMatch) {
              fullHTML = fullHTML.replace('</body>', sectionHTML + '</body>');
            } else {
              fullHTML += sectionHTML;
            }
          } else {
            // Insert section before closing body
            const insertPoint = fullHTML.lastIndexOf('</body>');
            if (insertPoint > -1) {
              fullHTML = fullHTML.slice(0, insertPoint) + sectionHTML + fullHTML.slice(insertPoint);
            } else {
              fullHTML += sectionHTML;
            }
          }

          // Update preview after each section
          handleCodeChange(cleanGeneratedCode(fullHTML));

          // Small delay between requests
          if (i < sections.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        setPrompt('');
        setGenerationProgress('');
        setIsGenerating(false);
        return;
      }

      // Regular single request for simple prompts
      const requestPayload = {
        message: prompt,
        browserData: {
          isWebBuilder: true,
          targetFile: selectedFile?.name || 'index.html',
          existingContent: code,
          figmaContext: figmaData || figmaContext,
          hasUploadedImage: !!uploadedImage,
          imageDescription: uploadedImage ? enhancedPrompt : null
        }
      };

      // DEBUG: Log exact payload being sent
      console.log('REQUEST PAYLOAD:', JSON.stringify(requestPayload, null, 2));
      console.log('Figma context size:', JSON.stringify(requestPayload.browserData.figmaContext || {}).length, 'bytes');

      // Validate payload before sending
      const validationErrors = validatePayload(requestPayload);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(90000), // 90 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('Response from API:', data);

      let generatedCode = data.response || data.message; // Use the correct response field

      // Clean the generated code before using it
      generatedCode = cleanGeneratedCode(generatedCode);

      handleCodeChange(generatedCode);
      setPrompt('');
    } catch (error: any) {
      console.error('Error generating code:', error);
      const errorMessage = error.name === 'AbortError'
        ? 'Request timed out after 90 seconds. Please try a simpler request.'
        : error.message || 'Failed to generate code. Please try again.';
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* Left Sidebar - File Explorer */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <h3 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Files</h3>
        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => {
                setSelectedFile(file);
                setCode(file.content || '');
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                selectedFile?.path === file.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <i className={`fas fa-${file.type === 'file' ? 'file-code' : 'folder'} mr-2`}></i>
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Center - Code Editor */}
      <div className="flex-1 flex flex-col">
        {/* AI Prompt Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateCode()}
              placeholder="Describe what you want to build (e.g., 'Add a navigation menu with Home, About, Contact')"
              className="flex-1 px-4 py-2 bg-gray-900 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              disabled={isGenerating}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
              title="Upload Figma JSON or design screenshot"
            >
              <i className="fas fa-upload"></i>
            </button>
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  {generationProgress || 'Generating...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <i className="fas fa-magic"></i>
                  Generate
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 flex">
          <div className="flex-1 bg-gray-900">
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-full p-4 bg-gray-900 text-gray-300 font-mono text-sm focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Live Preview */}
          <div className="flex-1 bg-white">
            <iframe
              ref={iframeRef}
              key={iframeKey}
              className="w-full h-full"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedFile ? `Editing: ${selectedFile.name}` : 'No file selected'}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="hover:text-white transition-colors"
            >
              <i className="fas fa-sync mr-1"></i>
              Refresh Preview
            </button>
            <button className="hover:text-white transition-colors">
              <i className="fas fa-download mr-1"></i>
              Download
            </button>
            <button className="hover:text-white transition-colors">
              <i className="fas fa-rocket mr-1"></i>
              Deploy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with error boundary
const AIWebsiteBuilder: React.FC = () => {
  return (
    <ErrorBoundary>
      <AIWebsiteBuilderInner />
    </ErrorBoundary>
  );
};

// Mount the component
if (typeof window !== 'undefined') {
  const container = document.getElementById('ai-builder-root');
  if (container) {
    const root = createRoot(container);
    root.render(<AIWebsiteBuilder />);
  }
}

export default AIWebsiteBuilder;