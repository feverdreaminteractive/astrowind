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

export const WebContainerBuilder: React.FC = () => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // File system structure for WebContainer
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

// Read Figma data from input.json
const figmaData = JSON.parse(fs.readFileSync('input.json', 'utf8'));

console.log('Processing', figmaData.layouts?.length || 0, 'layouts...');

// Process layouts in chunks to build HTML
function processLayouts(layouts) {
  const chunks = [];
  const chunkSize = 5;

  for (let i = 0; i < layouts.length; i += chunkSize) {
    chunks.push(layouts.slice(i, i + chunkSize));
  }

  return chunks;
}

function layoutToHTML(layout) {
  const style = [
    'position: absolute',
    \`left: \${Math.round(layout.x)}px\`,
    \`top: \${Math.round(layout.y)}px\`,
    \`width: \${Math.round(layout.width)}px\`,
    \`height: \${Math.round(layout.height)}px\`,
    'background: #f0f0f0',
    'border: 1px solid #ccc',
    'box-sizing: border-box'
  ].join('; ');

  // Extract background color if available
  if (layout.fills && layout.fills[0]?.color) {
    const c = layout.fills[0].color;
    const rgb = \`rgb(\${Math.round(c.r*255)}, \${Math.round(c.g*255)}, \${Math.round(c.b*255)})\`;
    style.replace('#f0f0f0', rgb);
  }

  return \`<div id="\${layout.id}" style="\${style}" title="\${layout.name}">\${layout.name}</div>\`;
}

// Generate HTML
let html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Design</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      position: relative;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      font-size: 12px;
    }
  </style>
</head>
<body>
\`;

if (figmaData.layouts) {
  const chunks = processLayouts(figmaData.layouts);

  chunks.forEach((chunk, index) => {
    console.log(\`Processing chunk \${index + 1}/\${chunks.length} with \${chunk.length} elements\`);

    chunk.forEach(layout => {
      html += '  ' + layoutToHTML(layout) + '\\n';
    });
  });
}

html += \`</body>
</html>\`;

// Write output
fs.writeFileSync('output.html', html);
console.log('Generated output.html with', figmaData.layouts?.length || 0, 'elements');
console.log('HTML size:', html.length, 'bytes');
`
      }
    }
  };

  // Boot WebContainer
  const bootWebContainer = async () => {
    if (isBooting || webcontainerInstance) return;

    setIsBooting(true);
    setLogs(prev => [...prev, 'Booting WebContainer...']);

    try {
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      // Mount files
      await instance.mount(files);

      // Install dependencies
      setLogs(prev => [...prev, 'Installing dependencies...']);
      const installProcess = await instance.spawn('npm', ['install']);

      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          setLogs(prev => [...prev, data]);
        }
      }));

      await installProcess.exit;

      setLogs(prev => [...prev, '✅ WebContainer ready!']);
      setIsBooting(false);
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      setLogs(prev => [...prev, `❌ Error: ${error}`]);
      setIsBooting(false);
    }
  };

  // Process Figma JSON
  const processFigmaJSON = async () => {
    if (!webcontainerInstance || !jsonInput) return;

    try {
      const json = JSON.parse(jsonInput);

      setProgress('Preparing data...');

      // Write input file
      await webcontainerInstance.fs.writeFile('input.json', JSON.stringify(json));

      setProgress('Processing layouts...');
      setLogs(prev => [...prev, '🚀 Starting processing...']);

      // Run processor
      const process = await webcontainerInstance.spawn('node', ['processor.js']);

      process.output.pipeTo(new WritableStream({
        write(data) {
          setLogs(prev => [...prev, data]);

          // Update progress from logs
          if (data.includes('Processing chunk')) {
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
    }
  };

  // Initialize on mount
  useEffect(() => {
    bootWebContainer();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">WebContainer Figma Processor</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">WebContainer:</span>
              {isBooting ? (
                <span className="text-yellow-600">Booting...</span>
              ) : webcontainerInstance ? (
                <span className="text-green-600">✅ Ready</span>
              ) : (
                <span className="text-gray-500">Not started</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Progress:</span>
              <span className="text-blue-600">{progress || 'Waiting...'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Figma JSON Input</h2>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your Figma JSON here..."
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs"
              disabled={!webcontainerInstance || isBooting}
            />
            <button
              onClick={processFigmaJSON}
              disabled={!webcontainerInstance || !jsonInput || isBooting}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Process with WebContainer
            </button>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Processing Logs</h2>
            <div className="h-64 overflow-y-auto bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
            <button
              onClick={() => setLogs([])}
              className="mt-4 px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Output */}
        {processedHTML && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Generated HTML</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Code</h3>
                <textarea
                  value={processedHTML}
                  readOnly
                  className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Preview</h3>
                <iframe
                  ref={iframeRef}
                  className="w-full h-96 border border-gray-300 rounded-lg bg-white"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(processedHTML);
                  alert('HTML copied to clipboard!');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Copy HTML
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([processedHTML], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'figma-design.html';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download HTML
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebContainerBuilder;