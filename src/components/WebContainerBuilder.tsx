import React, { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';

interface FigmaLayout {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: any[];
  children?: any[];
}

const WebContainerBuilder: React.FC = () => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [figmaToken, setFigmaToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'json'>('url');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Enhanced file system with Figma parser
  const files = {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'figma-processor',
          type: 'module',
          dependencies: {
            'cheerio': '^1.0.0-rc.12'
          },
          scripts: {
            process: 'node processor.js'
          }
        }, null, 2)
      }
    },
    'processor.js': {
      file: {
        contents: `
import fs from 'fs';

// Advanced Figma Parser
class FigmaParser {
  constructor(figmaData) {
    this.data = figmaData;
    this.styles = {};
    this.designTokens = {
      colors: {},
      spacing: {},
      typography: {}
    };
  }

  parse() {
    const document = this.data.document || this.data;
    const layouts = this.extractLayouts(document);

    return {
      name: this.data.name,
      layouts: layouts,
      styles: this.styles,
      designTokens: this.designTokens
    };
  }

  extractLayouts(node, parentX = 0, parentY = 0) {
    const layouts = [];

    const processNode = (n, pX = 0, pY = 0) => {
      if (!n.visible && n.visible !== undefined) return;

      const bounds = n.absoluteBoundingBox || n.boundingBox || {};
      const layout = {
        id: n.id,
        name: n.name,
        type: n.type,
        x: bounds.x || pX,
        y: bounds.y || pY,
        width: bounds.width || 100,
        height: bounds.height || 100,
        // Layout properties
        layoutMode: n.layoutMode,
        itemSpacing: n.itemSpacing,
        padding: n.paddingTop ? {
          top: n.paddingTop,
          right: n.paddingRight,
          bottom: n.paddingBottom,
          left: n.paddingLeft
        } : null,
        // Style properties
        fills: n.fills,
        strokes: n.strokes,
        effects: n.effects,
        cornerRadius: n.cornerRadius,
        opacity: n.opacity,
        // Text properties
        characters: n.characters,
        style: n.style
      };

      layouts.push(layout);

      if (n.children) {
        n.children.forEach(child => {
          processNode(child, layout.x, layout.y);
        });
      }
    };

    if (node.children) {
      node.children.forEach(child => processNode(child, parentX, parentY));
    } else {
      processNode(node, parentX, parentY);
    }

    return layouts;
  }

  generateHTML(parsedData) {
    const layouts = parsedData.layouts || [];

    // Start HTML structure
    let html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${parsedData.name || 'Figma Design'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      position: relative;
      min-height: 100vh;
    }
    .element {
      position: absolute;
      transition: all 0.3s ease;
    }
    .element:hover {
      box-shadow: 0 0 0 2px #3b82f6;
      z-index: 1000;
    }
    .flex-container {
      display: flex;
    }
    .flex-horizontal {
      flex-direction: row;
    }
    .flex-vertical {
      flex-direction: column;
    }
  </style>
</head>
<body>\n\`;

    // Process each layout element
    layouts.forEach(layout => {
      const styles = this.generateStyles(layout);
      const className = this.getClassName(layout);
      const content = this.getContent(layout);

      html += \`  <div id="\${layout.id}" class="element \${className}" style="\${styles}" title="\${layout.name}">
    \${content}
  </div>\n\`;
    });

    html += \`</body>
</html>\`;

    return html;
  }

  generateStyles(layout) {
    const styles = [];

    // Position and size
    styles.push(\`left: \${Math.round(layout.x)}px\`);
    styles.push(\`top: \${Math.round(layout.y)}px\`);
    styles.push(\`width: \${Math.round(layout.width)}px\`);
    styles.push(\`height: \${Math.round(layout.height)}px\`);

    // Background
    if (layout.fills && layout.fills.length > 0) {
      const fill = layout.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const c = fill.color;
        const rgb = \`rgba(\${Math.round(c.r*255)}, \${Math.round(c.g*255)}, \${Math.round(c.b*255)}, \${fill.opacity || 1})\`;
        styles.push(\`background-color: \${rgb}\`);
      }
    }

    // Border radius
    if (layout.cornerRadius) {
      styles.push(\`border-radius: \${layout.cornerRadius}px\`);
    }

    // Opacity
    if (layout.opacity !== undefined && layout.opacity < 1) {
      styles.push(\`opacity: \${layout.opacity}\`);
    }

    // Flexbox
    if (layout.layoutMode === 'HORIZONTAL') {
      styles.push('display: flex');
      styles.push('flex-direction: row');
    } else if (layout.layoutMode === 'VERTICAL') {
      styles.push('display: flex');
      styles.push('flex-direction: column');
    }

    if (layout.itemSpacing) {
      styles.push(\`gap: \${layout.itemSpacing}px\`);
    }

    // Padding
    if (layout.padding) {
      styles.push(\`padding: \${layout.padding.top}px \${layout.padding.right}px \${layout.padding.bottom}px \${layout.padding.left}px\`);
    }

    // Text styles
    if (layout.style) {
      if (layout.style.fontSize) styles.push(\`font-size: \${layout.style.fontSize}px\`);
      if (layout.style.fontWeight) styles.push(\`font-weight: \${layout.style.fontWeight}\`);
      if (layout.style.textAlignHorizontal) {
        const align = layout.style.textAlignHorizontal.toLowerCase();
        styles.push(\`text-align: \${align}\`);
      }
    }

    return styles.join('; ');
  }

  getClassName(layout) {
    const classes = [];
    if (layout.layoutMode === 'HORIZONTAL') classes.push('flex-horizontal');
    if (layout.layoutMode === 'VERTICAL') classes.push('flex-vertical');
    return classes.join(' ');
  }

  getContent(layout) {
    if (layout.characters) {
      return layout.characters;
    }
    if (layout.type === 'TEXT') {
      return layout.name;
    }
    return \`<span style="font-size: 11px; color: #666;">\${layout.name}</span>\`;
  }
}

// Read and process Figma data
const figmaData = JSON.parse(fs.readFileSync('input.json', 'utf8'));
console.log('Processing Figma design:', figmaData.name);

const parser = new FigmaParser(figmaData);
const parsed = parser.parse();

console.log('Found', parsed.layouts.length, 'elements');

// Generate HTML
const html = parser.generateHTML(parsed);

// Write output
fs.writeFileSync('output.html', html);

console.log('✅ HTML generation complete!');
console.log('Output written to output.html');
`
      }
    }
  };

  // Boot WebContainer
  const bootWebContainer = async () => {
    if (webcontainerInstance || isBooting) return;

    try {
      setIsBooting(true);
      setLogs(['🚀 Starting WebContainer...']);

      // Check if WebContainer is available
      if (!WebContainer) {
        throw new Error('WebContainer not available. This feature requires a modern browser with WebAssembly support.');
      }

      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      setLogs(prev => [...prev, '📁 Mounting file system...']);

      // Mount files
      await instance.mount(files);

      setLogs(prev => [...prev, '📦 Installing dependencies...']);

      // Install dependencies
      const installProcess = await instance.spawn('npm', ['install']);

      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          setLogs(prev => [...prev, data]);
        }
      }));

      await installProcess.exit;

      setLogs(prev => [...prev, '✅ WebContainer ready!']);
      setIsBooting(false);
    } catch (error: any) {
      console.error('Failed to boot WebContainer:', error);
      setLogs(prev => [...prev, `❌ Error: ${error.message || error}`]);

      // Common error messages
      if (error.message?.includes('SharedArrayBuffer')) {
        setLogs(prev => [...prev, '⚠️ Your browser requires specific headers for WebContainers.']);
        setLogs(prev => [...prev, '💡 Try using Chrome or Edge, and ensure the site is served with proper CORS headers.']);
      }

      setIsBooting(false);
    }
  };

  // Fetch Figma data from URL
  const fetchFigmaData = async () => {
    if (!figmaUrl) {
      setLogs(prev => [...prev, '❌ Please enter a Figma URL']);
      return;
    }

    setIsProcessing(true);
    setLogs(prev => [...prev, '🔍 Fetching Figma design...']);

    try {
      // Extract file ID from URL
      const fileMatch = figmaUrl.match(/figma\.com\/(?:file|design)\/([^/?\s]+)/);
      if (!fileMatch) {
        throw new Error('Invalid Figma URL format');
      }

      const fileKey = fileMatch[1];

      // Try server proxy first
      try {
        const response = await fetch(`/api/figma-proxy?url=${encodeURIComponent(figmaUrl)}`);
        if (response.ok) {
          const data = await response.json();
          setJsonInput(JSON.stringify(data, null, 2));
          setLogs(prev => [...prev, '✅ Fetched Figma data via proxy']);
          await processFigmaJSON(data);
          return;
        }
      } catch (e) {
        console.log('Proxy failed, trying direct API...');
      }

      // Use token if available
      const token = figmaToken || localStorage.getItem('figmaToken') || '';

      const apiUrl = `https://api.figma.com/v1/files/${fileKey}`;
      const response = await fetch(apiUrl, {
        headers: {
          'X-Figma-Token': token
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setShowTokenInput(true);
          throw new Error('Invalid Figma token. Please enter your token.');
        }
        throw new Error(`Figma API error: ${response.status}`);
      }

      const data = await response.json();
      setJsonInput(JSON.stringify(data, null, 2));
      setLogs(prev => [...prev, '✅ Fetched Figma data']);

      await processFigmaJSON(data);

    } catch (error) {
      console.error('Error fetching Figma:', error);
      setLogs(prev => [...prev, `❌ Error: ${error}`]);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Figma JSON
  const processFigmaJSON = async (data?: any) => {
    if (!webcontainerInstance) {
      setLogs(prev => [...prev, '❌ WebContainer not ready']);
      return;
    }

    try {
      const json = data || JSON.parse(jsonInput);
      if (!json) {
        setLogs(prev => [...prev, '❌ No data to process']);
        return;
      }

      setProgress('Processing Figma design...');
      setIsProcessing(true);

      // Write input file
      await webcontainerInstance.fs.writeFile('input.json', JSON.stringify(json));

      setLogs(prev => [...prev, '🎨 Processing layouts...']);

      // Run processor
      const process = await webcontainerInstance.spawn('node', ['processor.js']);

      process.output.pipeTo(new WritableStream({
        write(data) {
          setLogs(prev => [...prev, data]);
          if (data.includes('Found')) {
            setProgress(data);
          }
        }
      }));

      await process.exit;

      // Read output
      const output = await webcontainerInstance.fs.readFile('output.html', 'utf-8');
      setProcessedHTML(output);
      setProgress('✅ Complete!');

      // Update iframe
      if (iframeRef.current) {
        iframeRef.current.srcdoc = output;
      }

    } catch (error) {
      console.error('Processing error:', error);
      setProgress(`❌ Error: ${error}`);
      setLogs(prev => [...prev, `❌ Error: ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize on mount with delay for browser readiness
  useEffect(() => {
    // Small delay to ensure browser environment is ready
    const timer = setTimeout(() => {
      bootWebContainer();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">WebContainer Figma Builder</h1>
          <p className="text-gray-400">Transform Figma designs into HTML using browser-based Node.js</p>
        </div>

        {/* Status Bar */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">WebContainer:</span>
                {isBooting ? (
                  <span className="text-yellow-500 text-sm">🔄 Booting...</span>
                ) : webcontainerInstance ? (
                  <span className="text-green-500 text-sm">✅ Ready</span>
                ) : (
                  <span className="text-gray-500 text-sm">⚪ Not started</span>
                )}
              </div>
              {progress && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Progress:</span>
                  <span className="text-blue-400 text-sm">{progress}</span>
                </div>
              )}
            </div>
            {!webcontainerInstance && !isBooting && (
              <button
                onClick={bootWebContainer}
                className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                🚀 Start WebContainer
              </button>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Figma Input</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('url')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  URL
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {activeTab === 'url' ? (
              <div>
                <input
                  type="text"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  placeholder="https://www.figma.com/file/..."
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 mb-4"
                  disabled={!webcontainerInstance || isProcessing}
                />
                {showTokenInput && (
                  <input
                    type="password"
                    value={figmaToken}
                    onChange={(e) => setFigmaToken(e.target.value)}
                    placeholder="Enter your Figma API token"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 mb-4"
                  />
                )}
                <button
                  onClick={fetchFigmaData}
                  disabled={!webcontainerInstance || !figmaUrl || isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? '⚙️ Processing...' : '🎨 Fetch & Process Figma'}
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your Figma JSON here..."
                  className="w-full h-64 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 font-mono text-xs mb-4"
                  disabled={!webcontainerInstance || isProcessing}
                />
                <button
                  onClick={() => processFigmaJSON()}
                  disabled={!webcontainerInstance || !jsonInput || isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? '⚙️ Processing...' : '🚀 Process JSON'}
                </button>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Processing Logs</h2>
              <button
                onClick={() => setLogs([])}
                className="text-sm text-gray-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="h-80 overflow-y-auto bg-[#0a0a0a] rounded-lg p-3 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="text-green-400 mb-1">{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Output Section */}
        {processedHTML && (
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-4">Generated HTML</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Code</h3>
                <textarea
                  value={processedHTML}
                  readOnly
                  className="w-full h-96 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-gray-300 font-mono text-xs"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Preview</h3>
                <iframe
                  ref={iframeRef}
                  className="w-full h-96 border border-gray-700 rounded-lg bg-white"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebContainerBuilder;
export { WebContainerBuilder };