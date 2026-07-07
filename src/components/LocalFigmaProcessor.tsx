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
  const [figmaUrl, setFigmaUrl] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ layouts: 0, chunks: 0, bytes: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch Figma data from URL
  const fetchFigmaData = async () => {
    if (!figmaUrl) return;

    setIsLoading(true);
    setProgress('Fetching Figma data...');

    try {
      const response = await fetch(`/api/figma-proxy?url=${encodeURIComponent(figmaUrl)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch Figma data');
      }

      const data = await response.json();
      setJsonInput(JSON.stringify(data, null, 2));
      setProgress('✅ Figma data loaded! Click Process to generate HTML.');
    } catch (error: any) {
      console.error('Error fetching Figma:', error);
      setProgress(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Process Figma JSON locally
  const processFigmaJSON = () => {
    if (!jsonInput) return;

    try {
      setProgress('Parsing JSON...');
      const data = JSON.parse(jsonInput);

      // Handle both simplified and full Figma format
      let layouts = data.layouts || [];
      let colors = data.colors || [];
      let dimensions = data.dimensions || { width: 1920, height: 1080 };

      // If this is full Figma format, extract layouts from document
      if (data.document && !data.layouts) {
        layouts = [];
        const extractLayouts = (node: any) => {
          if (node.absoluteBoundingBox) {
            layouts.push({
              id: node.id,
              name: node.name,
              type: node.type,
              x: node.absoluteBoundingBox.x,
              y: node.absoluteBoundingBox.y,
              width: node.absoluteBoundingBox.width,
              height: node.absoluteBoundingBox.height,
              fills: node.fills
            });
          }
          if (node.children) {
            node.children.forEach(extractLayouts);
          }
        };
        extractLayouts(data.document);

        // Extract dimensions from first canvas
        if (data.document.children?.[0]?.absoluteBoundingBox) {
          const canvas = data.document.children[0].absoluteBoundingBox;
          dimensions = { width: canvas.width, height: canvas.height };
        }
      }

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
      color: #333;
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
      color: #1a1a1a;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      padding: 2px 4px;
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

      // Generate elements with enhanced styling
      chunks.forEach((chunk, chunkIndex) => {
        setProgress(`Processing chunk ${chunkIndex + 1}/${chunks.length}...`);

        chunk.forEach((layout: any) => {
          const x = Math.round(layout.x);
          const y = Math.round(layout.y);
          const width = Math.round(layout.width);
          const height = Math.round(layout.height);

          // Build comprehensive styles
          const styles: string[] = [
            `left: ${x}px`,
            `top: ${y}px`,
            `width: ${width}px`,
            `height: ${height}px`
          ];

          // Apply opacity if not 1
          if (layout.opacity !== undefined && layout.opacity !== 1) {
            styles.push(`opacity: ${layout.opacity}`);
          }

          // Apply rotation if present
          if (layout.rotation && layout.rotation !== 0) {
            styles.push(`transform: rotate(${layout.rotation}deg)`);
          }

          // Extract background from fills
          if (layout.fills && Array.isArray(layout.fills)) {
            const visibleFills = layout.fills.filter((f: any) => f.visible !== false);
            if (visibleFills.length > 0) {
              const fill = visibleFills[0];
              if (fill.type === 'SOLID' && fill.color) {
                const c = fill.color;
                const opacity = (fill.opacity || 1) * (c.a || 1);
                styles.push(`background: rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${opacity})`);
              } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
                const stops = fill.gradientStops.map((stop: any) => {
                  const c = stop.color;
                  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1}) ${stop.position * 100}%`;
                }).join(', ');
                styles.push(`background: linear-gradient(${stops})`);
              } else if (fill.type === 'IMAGE' && fill.imageRef) {
                // For now, use a placeholder for images
                styles.push(`background: #f0f0f0`);
              }
            }
          }

          // Extract border from strokes
          if (layout.strokes && Array.isArray(layout.strokes)) {
            const visibleStrokes = layout.strokes.filter((s: any) => s.visible !== false);
            if (visibleStrokes.length > 0) {
              const stroke = visibleStrokes[0];
              if (stroke.color) {
                const c = stroke.color;
                const weight = layout.strokeWeight || 1;
                styles.push(`border: ${weight}px solid rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1})`);
              }
            }
          }

          // Apply corner radius
          if (layout.cornerRadius) {
            styles.push(`border-radius: ${layout.cornerRadius}px`);
          } else if (layout.rectangleCornerRadii) {
            const [tl, tr, br, bl] = layout.rectangleCornerRadii;
            styles.push(`border-radius: ${tl}px ${tr}px ${br}px ${bl}px`);
          }

          // Apply effects (shadows)
          if (layout.effects && Array.isArray(layout.effects)) {
            const shadows = layout.effects
              .filter((e: any) => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
              .map((e: any) => {
                const c = e.color || { r: 0, g: 0, b: 0, a: 0.25 };
                const x = e.offset?.x || 0;
                const y = e.offset?.y || 0;
                const blur = e.radius || 0;
                const spread = e.spread || 0;
                const inset = e.type === 'INNER_SHADOW' ? 'inset ' : '';
                return `${inset}${x}px ${y}px ${blur}px ${spread}px rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1})`;
              });
            if (shadows.length > 0) {
              styles.push(`box-shadow: ${shadows.join(', ')}`);
            }
          }

          // Apply Auto Layout properties as flexbox
          if (layout.layoutMode) {
            styles.push('display: flex');
            if (layout.layoutMode === 'HORIZONTAL') {
              styles.push('flex-direction: row');
            } else if (layout.layoutMode === 'VERTICAL') {
              styles.push('flex-direction: column');
            }

            // Alignment
            const alignMap: any = {
              'MIN': 'flex-start',
              'CENTER': 'center',
              'MAX': 'flex-end',
              'SPACE_BETWEEN': 'space-between'
            };
            if (layout.primaryAxisAlignItems) {
              styles.push(`justify-content: ${alignMap[layout.primaryAxisAlignItems] || 'flex-start'}`);
            }
            if (layout.counterAxisAlignItems) {
              styles.push(`align-items: ${alignMap[layout.counterAxisAlignItems] || 'flex-start'}`);
            }

            // Padding
            if (layout.paddingLeft || layout.paddingRight || layout.paddingTop || layout.paddingBottom) {
              styles.push(`padding: ${layout.paddingTop || 0}px ${layout.paddingRight || 0}px ${layout.paddingBottom || 0}px ${layout.paddingLeft || 0}px`);
            }

            // Gap
            if (layout.itemSpacing) {
              styles.push(`gap: ${layout.itemSpacing}px`);
            }
          }

          // Handle text nodes specially
          let content = '';
          if (layout.type === 'TEXT' && layout.characters) {
            content = layout.characters;
            if (layout.style) {
              const s = layout.style;
              if (s.fontSize) styles.push(`font-size: ${s.fontSize}px`);
              if (s.fontFamily) styles.push(`font-family: '${s.fontFamily}'`);
              if (s.fontWeight) styles.push(`font-weight: ${s.fontWeight}`);
              if (s.lineHeightPx) styles.push(`line-height: ${s.lineHeightPx}px`);
              if (s.letterSpacing) styles.push(`letter-spacing: ${s.letterSpacing}px`);
              if (s.textCase === 'UPPER') styles.push('text-transform: uppercase');
              if (s.textCase === 'LOWER') styles.push('text-transform: lowercase');
              if (s.textCase === 'TITLE') styles.push('text-transform: capitalize');
            }
            if (layout.textAlignHorizontal) {
              const alignMap: any = { 'LEFT': 'left', 'CENTER': 'center', 'RIGHT': 'right', 'JUSTIFIED': 'justify' };
              styles.push(`text-align: ${alignMap[layout.textAlignHorizontal] || 'left'}`);
            }
            // Remove default element styles for text
            styles.push('border: none', 'background: transparent', 'display: block');
          }

          // Determine element class based on type
          let elementClass = 'element';
          if (layout.type === 'FRAME') elementClass += ' element-frame';
          else if (layout.type === 'COMPONENT' || layout.type === 'INSTANCE') elementClass += ' element-component';
          else if (layout.type === 'VECTOR' || layout.type === 'RECTANGLE' || layout.type === 'ELLIPSE') elementClass += ' element-vector';
          else if (layout.type === 'TEXT') elementClass = 'element-text-node'; // Don't include base element class

          html += `    <div
      id="${layout.id}"
      class="${elementClass}"
      style="${styles.join('; ')}"
      title="${layout.name} (${layout.type})"
      data-type="${layout.type}">
      ${content || `<span class="element-text">${layout.name || layout.type}</span>`}
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
              <span className="mr-2">📋</span> Input
            </h2>

            {/* Figma URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Figma URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  placeholder="https://www.figma.com/design/..."
                  className="flex-1 p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={fetchFigmaData}
                  disabled={!figmaUrl || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {isLoading ? '⏳' : '🔗'} Fetch
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-2">Or paste JSON directly:</div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your figma-simplified.json here..."
              className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg font-mono text-xs focus:border-blue-500 focus:outline-none"
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