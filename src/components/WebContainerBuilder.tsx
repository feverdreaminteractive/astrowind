import React, { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';

// Figma layout interface for parsing

const WebContainerBuilder: React.FC = () => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [processedCSS, setProcessedCSS] = useState('');
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [figmaToken, setFigmaToken] = useState('');  // Fallback option
  const [showTokenInput] = useState(false);  // Proxy handles auth
  const [activeTab, setActiveTab] = useState<'url' | 'json' | 'help'>('url');
  const [previewMode, setPreviewMode] = useState<'preview' | 'code' | 'split'>('split');
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Enhanced file system with Figma MCP server
  const files = {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'figma-processor',
          type: 'module',
          dependencies: {
            '@modelcontextprotocol/sdk': '^0.5.0',
            'node-fetch': '^3.3.2'
          },
          scripts: {
            process: 'node processor.js',
            'mcp-server': 'node mcp-server.js',
            'fetch': 'node mcp-client.js',
            'fetch-and-process': 'node mcp-client.js && node processor.js'
          }
        }, null, 2)
      }
    },
    'mcp-server.js': {
      file: {
        contents: `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fetch from 'node-fetch';

// Official Figma MCP Server implementation
class FigmaMCPServer {
  constructor() {
    this.server = new Server({
      name: 'figma-mcp',
      version: '1.0.0',
      description: 'MCP server for fetching Figma designs'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'get_file',
          description: 'Get a Figma file by key',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: {
                type: 'string',
                description: 'The key/ID of the Figma file'
              },
              token: {
                type: 'string',
                description: 'Figma personal access token (optional if FIGMA_TOKEN env var is set)'
              },
              geometry: {
                type: 'string',
                description: 'Comma-separated list of paths to export (optional)'
              },
              version: {
                type: 'string',
                description: 'Version ID to fetch (optional)'
              }
            },
            required: ['fileKey']
          }
        },
        {
          name: 'get_file_nodes',
          description: 'Get specific nodes from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: { type: 'string', description: 'The Figma file key' },
              ids: { type: 'string', description: 'Comma-separated node IDs' },
              token: { type: 'string', description: 'Figma token (optional)' }
            },
            required: ['fileKey', 'ids']
          }
        },
        {
          name: 'get_images',
          description: 'Export images from a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              fileKey: { type: 'string' },
              ids: { type: 'string', description: 'Node IDs to export' },
              scale: { type: 'number', default: 1 },
              format: { type: 'string', enum: ['jpg', 'png', 'svg', 'pdf'], default: 'png' },
              token: { type: 'string' }
            },
            required: ['fileKey', 'ids']
          }
        },
        {
          name: 'extract_from_url',
          description: 'Extract file key from a Figma URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The Figma file URL' }
            },
            required: ['url']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      // Get token from args or environment
      const token = args.token || process.env.FIGMA_TOKEN;

      switch (name) {
        case 'extract_from_url': {
          const match = args.url.match(/figma\.com\/(?:file|design)\/([^/\\?]+)/);
          if (match) {
            return {
              content: [{
                type: 'text',
                text: \`File key: \${match[1]}\`
              }]
            };
          }
          throw new Error('Invalid Figma URL');
        }

        case 'get_file': {
          if (!token) {
            throw new Error('No Figma token provided. Set FIGMA_TOKEN environment variable or pass token parameter.');
          }

          const url = \`https://api.figma.com/v1/files/\${args.fileKey}\`;
          const params = new URLSearchParams();
          if (args.geometry) params.append('geometry', args.geometry);
          if (args.version) params.append('version', args.version);

          const fullUrl = params.toString() ? \`\${url}?\${params}\` : url;

          const response = await fetch(fullUrl, {
            headers: { 'X-Figma-Token': token }
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(\`Figma API error (\${response.status}): \${error}\`);
          }

          const data = await response.json();

          // Save to cache file for processor
          const fs = await import('fs');
          fs.writeFileSync('figma-cache.json', JSON.stringify(data, null, 2));

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                name: data.name,
                lastModified: data.lastModified,
                version: data.version,
                documentName: data.document?.name,
                pages: data.document?.children?.length || 0,
                cached: true
              }, null, 2)
            }]
          };
        }

        case 'get_file_nodes': {
          if (!token) {
            throw new Error('No Figma token provided');
          }

          const url = \`https://api.figma.com/v1/files/\${args.fileKey}/nodes?ids=\${args.ids}\`;

          const response = await fetch(url, {
            headers: { 'X-Figma-Token': token }
          });

          if (!response.ok) {
            throw new Error(\`Figma API error: \${response.status}\`);
          }

          const data = await response.json();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        case 'get_images': {
          if (!token) {
            throw new Error('No Figma token provided');
          }

          const url = \`https://api.figma.com/v1/images/\${args.fileKey}\`;
          const params = new URLSearchParams({
            ids: args.ids,
            scale: args.scale || 1,
            format: args.format || 'png'
          });

          const response = await fetch(\`\${url}?\${params}\`, {
            headers: { 'X-Figma-Token': token }
          });

          if (!response.ok) {
            throw new Error(\`Figma API error: \${response.status}\`);
          }

          const data = await response.json();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        default:
          throw new Error(\`Unknown tool: \${name}\`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma MCP Server started successfully');
  }
}

// Start the server
const server = new FigmaMCPServer();
server.start().catch(console.error);
`
      }
    },
    'mcp-client.js': {
      file: {
        contents: `
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import fs from 'fs';

// MCP Client to interact with the Figma MCP Server
class FigmaMCPClient {
  constructor() {
    this.client = new Client({
      name: 'figma-mcp-client',
      version: '1.0.0'
    });
  }

  async connect() {
    // Start the MCP server as a subprocess
    const serverProcess = spawn('node', ['mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const transport = new StdioClientTransport({
      stdioProcess: serverProcess
    });

    await this.client.connect(transport);
    console.log('Connected to Figma MCP Server');
  }

  async fetchFigmaFile(fileKey, token) {
    try {
      // Extract file key from URL if needed
      if (fileKey.includes('figma.com')) {
        const extractResult = await this.client.callTool('extract_from_url', {
          url: fileKey
        });
        const match = extractResult.content[0].text.match(/File key: (.+)/);
        if (match) {
          fileKey = match[1];
        }
      }

      console.log(\`Fetching Figma file: \${fileKey}\`);

      // Fetch the file
      const result = await this.client.callTool('get_file', {
        fileKey: fileKey,
        token: token || process.env.FIGMA_TOKEN
      });

      // The server already saved to figma-cache.json
      if (fs.existsSync('figma-cache.json')) {
        const data = JSON.parse(fs.readFileSync('figma-cache.json', 'utf8'));

        // Copy to input.json for processor
        fs.writeFileSync('input.json', JSON.stringify(data, null, 2));

        console.log('✅ Figma file fetched successfully!');
        console.log(\`File: \${data.name}\`);
        console.log(\`Pages: \${data.document?.children?.length || 0}\`);

        return data;
      }

      return JSON.parse(result.content[0].text);
    } catch (error) {
      console.error('Error fetching Figma file:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.close();
  }
}

// CLI usage
async function main() {
  const fileKeyOrUrl = process.argv[2];
  const token = process.argv[3] || process.env.FIGMA_TOKEN;

  if (!fileKeyOrUrl) {
    console.log('Usage: node mcp-client.js <figma-url-or-file-key> [token]');
    console.log('Token can also be set via FIGMA_TOKEN environment variable');
    process.exit(1);
  }

  const client = new FigmaMCPClient();

  try {
    await client.connect();
    await client.fetchFigmaFile(fileKeyOrUrl, token);
    await client.disconnect();

    console.log('\nReady to process! Run: node processor.js');
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1].includes('mcp-client.js')) {
  main();
}

export { FigmaMCPClient };
`
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
  <${'/' + 'style'}>
<${'/' + 'head'}>
<body>\n\`;

    // Process each layout element
    layouts.forEach(layout => {
      const styles = this.generateStyles(layout);
      const className = this.getClassName(layout);
      const content = this.getContent(layout);

      html += \`  <div id="\${layout.id}" class="element \${className}" style="\${styles}" title="\${layout.name}">
    \${content}
  <${'/' + 'div'}>\n\`;
    });

    html += \`<${'/' + 'body'}>
<${'/' + 'html'}>\`;

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

  // Save to local storage
  const saveToLocalStorage = (fileId: string, data: any) => {
    try {
      const cache = JSON.parse(localStorage.getItem('figmaCache') || '{}');
      cache[fileId] = {
        data,
        timestamp: Date.now(),
        name: data.name
      };
      // Keep only last 10 cached designs
      const keys = Object.keys(cache);
      if (keys.length > 10) {
        const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
        delete cache[oldest];
      }
      localStorage.setItem('figmaCache', JSON.stringify(cache));
      setLogs(prev => [...prev, '💾 Saved to local cache']);
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  };

  // Load from local storage
  const loadFromLocalStorage = (fileId: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem('figmaCache') || '{}');
      const cached = cache[fileId];
      if (cached && cached.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        setLogs(prev => [...prev, '📦 Loaded from local cache']);
        return cached.data;
      }
    } catch (e) {
      console.error('Failed to load from local storage:', e);
    }
    return null;
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
      // Extract file key from URL
      const urlMatch = figmaUrl.match(/figma\.com\/(?:file|design)\/([^/\?\s]+)/);
      if (!urlMatch) {
        throw new Error('Invalid Figma URL format');
      }
      const fileKey = urlMatch[1];

      // Check local cache first
      const localCached = loadFromLocalStorage(fileKey);
      if (localCached) {
        setJsonInput(JSON.stringify(localCached, null, 2));
        await generatePreview(localCached);
        return;
      }

      // Use server proxy with Netlify FIGMA_TOKEN
      try {
        const response = await fetch(`/.netlify/functions/figma-proxy?url=${encodeURIComponent(figmaUrl)}`);
        if (response.ok) {
          const data = await response.json();
          setJsonInput(JSON.stringify(data, null, 2));
          setLogs(prev => [...prev, '✅ Fetched Figma data using server token']);
          saveToLocalStorage(fileKey, data);
          await generatePreview(data);
          return;
        } else if (response.status === 429) {
          await response.json();  // Read response to clear buffer
          setLogs(prev => [...prev, '⚠️ Rate limit reached. Designs are cached for 30 minutes.']);
          setLogs(prev => [...prev, '💡 Tip: You can paste Figma JSON directly in the JSON tab']);
          setActiveTab('json');
          throw new Error('Figma API rate limit reached. Please wait a moment or paste JSON directly.');
        }
      } catch (e: any) {
        // If proxy fails, show error and stop
        throw new Error(e.message || 'Failed to fetch Figma design. Please check the URL.');
      }

      // No fallback to direct API - only use proxy with server token

    } catch (error) {
      console.error('Error fetching Figma:', error);
      setLogs(prev => [...prev, `❌ Error: ${error}`]);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate preview using AI
  const generatePreview = async (figmaData: any) => {
    setIsGenerating(true);
    setLogs(prev => [...prev, '🤖 Generating HTML/CSS from Figma design...']);

    try {
      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'code',
          prompt: 'Generate complete HTML and CSS from this Figma design',
          figmaData: figmaData,
          isWebContainer: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate HTML/CSS');
      }

      const result = await response.json();

      // Extract HTML and CSS
      const htmlMatch = result.response.match(/```html\n([\s\S]*?)```/);
      const cssMatch = result.response.match(/```css\n([\s\S]*?)```/);

      const html = htmlMatch ? htmlMatch[1] : '<h1>Generated HTML</h1>';
      const css = cssMatch ? cssMatch[1] : 'body { font-family: system-ui; }';

      const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${figmaData.name || 'Figma Design'}</title>
  <style>${css}<${'/' + 'style'}>
<${'/' + 'head'}>
<body>
${html}
<${'/' + 'body'}>
<${'/' + 'html'}>`;

      setProcessedHTML(fullHTML);
      setProcessedCSS(css);

      // Update preview
      if (iframeRef.current) {
        iframeRef.current.srcdoc = fullHTML;
      }

      setLogs(prev => [...prev, '✅ HTML/CSS generated successfully']);

      // Now process in WebContainer if ready
      if (webcontainerInstance) {
        await processFigmaJSON(figmaData);
      }

    } catch (error: any) {
      setLogs(prev => [...prev, `❌ Generation error: ${error.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch using MCP client
  const fetchViaMCP = async () => {
    if (!webcontainerInstance) {
      setLogs(prev => [...prev, '❌ WebContainer not ready']);
      return;
    }

    if (!figmaUrl) {
      setLogs(prev => [...prev, '❌ Please enter a Figma URL']);
      return;
    }

    setIsProcessing(true);
    setLogs(prev => [...prev, '🔌 Starting MCP client...']);

    try {
      // Write token to env if available
      if (figmaToken) {
        await webcontainerInstance.fs.writeFile('.env', `FIGMA_TOKEN=${figmaToken}`);
      }

      // Run MCP client to fetch
      const fetchProcess = await webcontainerInstance.spawn('node', ['mcp-client.js', figmaUrl, figmaToken || '']);

      fetchProcess.output.pipeTo(new WritableStream({
        write(data) {
          setLogs(prev => [...prev, data]);
        }
      }));

      await fetchProcess.exit;

      // Check if file was fetched
      try {
        const jsonData = await webcontainerInstance.fs.readFile('input.json', 'utf-8');
        const data = JSON.parse(jsonData);
        setJsonInput(jsonData);
        setLogs(prev => [...prev, '✅ Fetched via MCP']);

        // Now process it
        await processFigmaJSON(data);
      } catch (e) {
        setLogs(prev => [...prev, '❌ Failed to read fetched data']);
      }

    } catch (error: any) {
      setLogs(prev => [...prev, `❌ MCP Error: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Figma JSON in WebContainer
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
    <>
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Input Section */}
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
                <button
                  onClick={() => setActiveTab('help')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'help'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Help
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
                  disabled={!webcontainerInstance || isProcessing || isGenerating}
                />
                {showTokenInput && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">
                      The server token is handling authentication, but if needed you can provide your own:
                    </p>
                    <input
                      type="password"
                      value={figmaToken}
                      onChange={(e) => {
                        setFigmaToken(e.target.value);
                        if (e.target.value) {
                          localStorage.setItem('figmaToken', e.target.value);
                        }
                      }}
                      placeholder="Optional: Your Figma API token"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={fetchFigmaData}
                    disabled={!webcontainerInstance || !figmaUrl || isProcessing || isGenerating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? '🤖 Generating...' : isProcessing ? '⚙️ Processing...' : '🎨 Fetch via Proxy'}
                  </button>
                  <button
                    onClick={fetchViaMCP}
                    disabled={!webcontainerInstance || !figmaUrl || isProcessing || isGenerating}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? '⚙️ Processing...' : '🔌 Fetch via MCP'}
                  </button>
                </div>
              </div>
            ) : activeTab === 'json' ? (
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
            ) : (
              <div className="text-gray-300 space-y-4">
                <h3 className="text-lg font-semibold text-white">How to Get Figma JSON</h3>

                <div className="space-y-3">
                  <div className="bg-[#0a0a0a] p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Option 1: Browser Console</h4>
                    <ol className="text-xs space-y-1 ml-4">
                      <li>1. Open your Figma file</li>
                      <li>2. Press Cmd+Option+I (Mac) or Ctrl+Alt+I (Win)</li>
                      <li>3. In console, type: <code className="bg-gray-800 px-1">copy(figma.root)</code></li>
                      <li>4. Paste the JSON in the JSON tab</li>
                    </ol>
                  </div>

                  <div className="bg-[#0a0a0a] p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Option 2: Figma API</h4>
                    <ol className="text-xs space-y-1 ml-4">
                      <li>1. Get token from Figma Settings</li>
                      <li>2. Extract file ID from URL</li>
                      <li>3. Run: <code className="bg-gray-800 px-1 text-xs break-all">curl -H "X-Figma-Token: TOKEN" "https://api.figma.com/v1/files/FILE_ID"</code></li>
                    </ol>
                  </div>

                  <div className="bg-[#0a0a0a] p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Rate Limits</h4>
                    <p className="text-xs">Figma API: 150 requests/minute</p>
                    <p className="text-xs">Cache duration: 24 hours</p>
                    <p className="text-xs">Local storage: Last 10 designs</p>
                  </div>

                  <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-600/30">
                    <p className="text-xs text-yellow-400">💡 Tip: Once fetched, designs are cached locally for 24 hours to avoid rate limits.</p>
                  </div>

                  <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-600/30">
                    <h4 className="text-sm font-medium text-purple-400 mb-2">MCP (Model Context Protocol)</h4>
                    <p className="text-xs">The MCP option runs a Figma MCP server in the WebContainer for advanced API access.</p>
                  </div>
                </div>
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
                <div className="h-64 overflow-y-auto bg-[#0a0a0a] rounded-lg p-3 font-mono text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="text-green-400 mb-1">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 h-[calc(100vh-12rem)] sticky top-6">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'preview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setPreviewMode('code')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'code'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setPreviewMode('split')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'split'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Split
                </button>
              </div>
            </div>

            <div className="p-4 h-[calc(100%-4rem)]">
              {processedHTML ? (
                previewMode === 'preview' ? (
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border border-gray-700 rounded-lg bg-white"
                    title="Preview"
                    sandbox="allow-scripts"
                  />
                ) : previewMode === 'code' ? (
                  <div className="h-full flex flex-col gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">HTML</h3>
                      <textarea
                        value={processedHTML}
                        readOnly
                        className="w-full h-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-gray-300 font-mono text-xs"
                      />
                    </div>
                    {processedCSS && (
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">CSS</h3>
                        <textarea
                          value={processedCSS}
                          readOnly
                          className="w-full h-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-gray-300 font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full grid grid-cols-2 gap-4">
                    <div className="h-full">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Code</h3>
                      <textarea
                        value={processedHTML}
                        readOnly
                        className="w-full h-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-gray-300 font-mono text-xs"
                      />
                    </div>
                    <div className="h-full">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Preview</h3>
                      <iframe
                        ref={iframeRef}
                        className="w-full h-full border border-gray-700 rounded-lg bg-white"
                        title="Preview"
                        sandbox="allow-scripts"
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No preview available</p>
                    <p className="text-sm">Enter a Figma URL or paste JSON to generate HTML</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebContainerBuilder;
export { WebContainerBuilder };