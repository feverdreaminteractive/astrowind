import React, { useState, useRef, useEffect } from 'react';

export const FigmaWorkerProcessor: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [processedHTML, setProcessedHTML] = useState('');
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ layouts: 0, time: 0, bytes: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize Web Worker
  useEffect(() => {
    const workerInstance = new Worker('/figma-processor-worker.js');

    workerInstance.onmessage = (event) => {
      const { type, result, error } = event.data;

      if (type === 'SUCCESS') {
        setProcessedHTML(result.html);
        setStats({
          layouts: result.layoutCount,
          time: Date.now() - startTime.current,
          bytes: result.html.length
        });
        setProgress('✅ Processing complete!');

        // Update preview
        if (iframeRef.current) {
          iframeRef.current.srcdoc = result.html;
        }
      } else if (type === 'ERROR') {
        setProgress(`❌ Error: ${error}`);
        console.error('Worker error:', error);
      }

      setIsLoading(false);
    };

    setWorker(workerInstance);

    return () => {
      workerInstance.terminate();
    };
  }, []);

  const startTime = useRef(0);

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

  // Process Figma JSON with Web Worker
  const processFigmaJSON = () => {
    if (!jsonInput || !worker) return;

    try {
      setIsLoading(true);
      setProgress('Processing with Web Worker...');
      startTime.current = Date.now();

      const data = JSON.parse(jsonInput);
      worker.postMessage({ type: 'PROCESS_FIGMA', data });

    } catch (error: any) {
      console.error('Processing error:', error);
      setProgress(`❌ Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Figma Worker Processor
          </h1>
          <p className="text-gray-600">
            High-performance Figma processing using Web Workers - handles complex designs without blocking the UI!
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.layouts}</div>
              <div className="text-sm text-gray-600">Layouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.time > 0 ? `${(stats.time / 1000).toFixed(2)}s` : '0s'}
              </div>
              <div className="text-sm text-gray-600">Process Time</div>
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
              placeholder="Paste your Figma JSON here..."
              className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={processFigmaJSON}
                disabled={!jsonInput || !worker || isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition"
              >
                ⚡ Process with Worker
              </button>
              <button
                onClick={() => {
                  setJsonInput('');
                  setProcessedHTML('');
                  setProgress('');
                  setStats({ layouts: 0, time: 0, bytes: 0 });
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

export default FigmaWorkerProcessor;