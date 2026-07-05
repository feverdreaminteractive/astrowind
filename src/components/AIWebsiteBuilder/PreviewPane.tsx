import React, { useEffect, useRef, useState } from 'react';

interface Props {
  project: any;
}

const PreviewPane: React.FC<Props> = ({ project }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    if (iframeReady) {
      updatePreview();
    }
  }, [project.files, iframeReady, project.name]); // Also trigger on project name change

  const updatePreview = () => {
    if (!iframeRef.current) return;

    setIsLoading(true);
    const iframe = iframeRef.current;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
      // Find HTML, CSS, and JS files
      const htmlFile = project.files.find((f: any) => f.name.endsWith('.html'));
      const cssFile = project.files.find((f: any) => f.name.endsWith('.css'));
      const jsFile = project.files.find((f: any) => f.name.endsWith('.js'));

      // If no files, show start screen
      if (project.files.length === 0) {
        const startScreenHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                background: #0a0a0a;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #e4e4e7;
              }
              .container {
                text-align: left;
                padding: 3rem;
                max-width: 600px;
              }
              .prompt {
                color: #71717a;
                font-size: 0.875rem;
                margin-bottom: 0.5rem;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              }
              h1 {
                font-size: 2.5rem;
                margin-bottom: 1.5rem;
                font-weight: 700;
                background: linear-gradient(to right, #fff, #71717a);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }
              .code-block {
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 2rem;
                font-size: 0.9rem;
              }
              .comment {
                color: #71717a;
                font-size: 0.875rem;
                line-height: 1.8;
              }
              .command {
                color: #a1a1aa;
                margin-top: 0.75rem;
                font-size: 0.875rem;
              }
              .keyword {
                color: #22d3ee;
              }
              .hint {
                font-size: 0.875rem;
                color: #52525b;
                margin-top: 2rem;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="prompt">// AI Website Builder</div>
              <h1>Ready to code.</h1>
              <div class="code-block">
                <div class="comment">// Describe what you want to build</div>
                <div class="comment">// and AI will generate the code</div>
              </div>
              <div class="hint">→ Use the AI Assistant panel to start</div>
            </div>
          </body>
          </html>
        `;
        iframeDoc.open();
        iframeDoc.write(startScreenHTML);
        iframeDoc.close();
        setTimeout(() => setIsLoading(false), 300);
        return;
      }

      let html = htmlFile?.content || '<h1>No HTML file found</h1>';

      // Inject CSS and JS inline for preview
      if (cssFile) {
        html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
        html = html.replace('<link rel="stylesheet" href="styles.css">', '');
      }

      if (jsFile) {
        html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
        html = html.replace('<script src="script.js"></script>', '');
      }

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        setTimeout(() => setIsLoading(false), 300);
      }
    } catch (error) {
      console.error('Error updating preview:', error);
      setIsLoading(false);
    }
  };

  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return { width: '375px', height: '667px', maxHeight: 'calc(100vh - 200px)' };
      case 'tablet':
        return { width: '768px', height: '100%', maxHeight: 'calc(100vh - 200px)' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col">
      {/* Preview Toolbar */}
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-300">
            <i className="fas fa-eye mr-2"></i>Preview
          </span>
          {isLoading && (
            <span className="text-xs text-yellow-400">
              <i className="fas fa-spinner fa-spin mr-1"></i>Loading...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Device Selector */}
          <div className="flex gap-1">
            <button
              onClick={() => setDevice('desktop')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                device === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Desktop"
            >
              <i className="fas fa-desktop"></i>
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                device === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Tablet"
            >
              <i className="fas fa-tablet-alt"></i>
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                device === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Mobile"
            >
              <i className="fas fa-mobile-alt"></i>
            </button>
          </div>

          <button
            onClick={updatePreview}
            className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          >
            <i className="fas fa-sync"></i>
          </button>

          <button
            onClick={() => {
              try {
                const iframe = iframeRef.current;
                if (iframe && iframe.contentWindow) {
                  const newWindow = window.open('', '_blank');
                  if (newWindow && iframe.contentDocument) {
                    newWindow.document.write(iframe.contentDocument.documentElement.outerHTML || '');
                  }
                }
              } catch (error) {
                console.error('Error opening preview in new window:', error);
              }
            }}
            className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          >
            <i className="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 bg-gray-900 flex items-center justify-center overflow-auto p-4">
        <div
          className={`${
            device !== 'desktop' ? 'border border-gray-300 shadow-lg overflow-hidden' : ''
          } ${
            device === 'tablet' ? 'h-full' : ''
          }`}
          style={getDeviceStyles()}
        >
          <iframe
            ref={iframeRef}
            className="bg-white"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Preview"
            sandbox="allow-scripts allow-forms allow-same-origin"
            onLoad={() => setIframeReady(true)}
            srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewPane;