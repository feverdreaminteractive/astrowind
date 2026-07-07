import React, { useState, useRef } from 'react';

interface FigmaLayout {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: any[];
}

export const LocalFigmaProcessor: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ layouts: 0, chunks: 0, bytes: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Process Figma JSON locally
  const processFigmaJSON = () => {
    if (!jsonInput) return;

    try {
      setProgress('Parsing JSON...');
      const data = JSON.parse(jsonInput);

      const layouts = data.layouts || [];
      const colors = data.colors || [];
      const dimensions = data.dimensions || { width: 1920, height: 1080 };

      setProgress(`Processing ${layouts.length} layouts...`);

      // Generate CSS from colors
      const colorVars = colors.slice(0, 10).map((c: any, i: number) => {
        if (typeof c === 'string') return `  --color-${i}: ${c};`;
        if (c.hex) return `  --color-${i}: ${c.hex};`;
        if (c.rgba) return `  --color-${i}: ${c.rgba};`;
        return '';
      }).filter(Boolean).join('\n');

      // Start building HTML
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name || 'Figma Design'}</title>
  <style>
    :root {
${colorVars}
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      position: relative;
      min-height: ${dimensions.height}px;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }

    .container {
      position: relative;
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    .element {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #666;
      border: 1px solid #e0e0e0;
      background: #fafafa;
      overflow: hidden;
      cursor: default;
      transition: all 0.2s ease;
    }

    .element:hover {
      border-color: #4285f4;
      background: #e8f0fe;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
    }

    .element-text {
      font-weight: 500;
      color: #333;
    }

    .element-frame {
      background: #fff;
      border-color: #dadce0;
    }

    .element-component {
      background: #f1f3ff;
      border-color: #8b9dc3;
    }

    .element-vector {
      background: #fff3e0;
      border-color: #ffb74d;
    }

    .element-text-node {
      background: #e8f5e9;
      border-color: #81c784;
    }
  </style>
</head>
<body>
  <div class="container">
`;

      // Process layouts in chunks for better performance
      const chunkSize = 10;
      const chunks = [];

      for (let i = 0; i < layouts.length; i += chunkSize) {
        chunks.push(layouts.slice(i, i + chunkSize));
      }

      setStats({ layouts: layouts.length, chunks: chunks.length, bytes: 0 });

      // Generate elements
      chunks.forEach((chunk, chunkIndex) => {
        setProgress(`Processing chunk ${chunkIndex + 1}/${chunks.length}...`);

        chunk.forEach((layout: FigmaLayout) => {
          const x = Math.round(layout.x);
          const y = Math.round(layout.y);
          const width = Math.round(layout.width);
          const height = Math.round(layout.height);

          // Determine element class based on type
          let elementClass = 'element';
          if (layout.type === 'FRAME') elementClass += ' element-frame';
          else if (layout.type === 'COMPONENT' || layout.type === 'INSTANCE') elementClass += ' element-component';
          else if (layout.type === 'VECTOR') elementClass += ' element-vector';
          else if (layout.type === 'TEXT') elementClass += ' element-text-node';

          // Extract background color if available
          let bgColor = '';
          if (layout.fills && layout.fills[0]?.color) {
            const c = layout.fills[0].color;
            bgColor = `background: rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1});`;
          }

          html += `    <div
      id="${layout.id}"
      class="${elementClass}"
      style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; ${bgColor}"
      title="${layout.name} (${layout.type})"
      data-type="${layout.type}">
      <span class="element-text">${layout.name}</span>
    </div>\n`;
        });
      });

      html += `  </div>

  <script>
    // Add interactivity
    document.querySelectorAll('.element').forEach(el => {
      el.addEventListener('click', function() {
        console.log('Clicked:', this.id, this.title);
      });
    });

    // Show stats
    console.log('Loaded ${layouts.length} elements in ${chunks.length} chunks');
  </script>
</body>
</html>`;

      setProcessedHTML(html);
      setStats(prev => ({ ...prev, bytes: html.length }));
      setProgress('✅ Processing complete!');

      // Update preview
      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      setProgress(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Local Figma Processor</h1>
          <p className="text-gray-600">Process Figma JSON entirely in your browser - no server needed!</p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.layouts}</div>
              <div className="text-sm text-gray-600">Layouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.chunks}</div>
              <div className="text-sm text-gray-600">Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.bytes > 0 ? `${(stats.bytes / 1024).toFixed(1)}KB` : '0KB'}
              </div>
              <div className="text-sm text-gray-600">HTML Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {progress.includes('✅') ? '✅' : progress.includes('❌') ? '❌' : '⏳'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">📋</span> Figma JSON Input
            </h2>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your figma-simplified.json here..."
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={processFigmaJSON}
                disabled={!jsonInput}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition"
              >
                🚀 Process JSON
              </button>
              <button
                onClick={() => {
                  setJsonInput('');
                  setProcessedHTML('');
                  setProgress('');
                  setStats({ layouts: 0, chunks: 0, bytes: 0 });
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
              >
                Clear
              </button>
            </div>
            {progress && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                {progress}
              </div>
            )}
          </div>

          {/* Output */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">📄</span> Generated HTML
            </h2>
            <textarea
              value={processedHTML}
              readOnly
              placeholder="Generated HTML will appear here..."
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg font-mono text-xs bg-gray-50"
            />
            {processedHTML && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(processedHTML);
                    alert('HTML copied to clipboard!');
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                >
                  📋 Copy HTML
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
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
                >
                  💾 Download
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {processedHTML && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">👁️</span> Live Preview
            </h2>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                className="w-full h-[600px] bg-white"
                title="Preview"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalFigmaProcessor;