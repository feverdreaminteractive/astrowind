import React, { useState } from 'react';

interface Chunk {
  id: number;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
}

export const JsonChunker: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalHTML, setFinalHTML] = useState('');
  const [currentChunk, setCurrentChunk] = useState(0);

  // Smart JSON chunking that preserves structure
  const chunkJSON = (json: any, maxLines: number = 300): string[] => {
    const chunks: string[] = [];

    if (json.layouts && Array.isArray(json.layouts)) {
      // For Figma data, chunk by layouts
      const layoutsPerChunk = 10; // Process 10 layouts at a time
      const totalLayouts = json.layouts.length;

      for (let i = 0; i < totalLayouts; i += layoutsPerChunk) {
        const chunkLayouts = json.layouts.slice(i, i + layoutsPerChunk);
        const chunkData = {
          ...json,
          layouts: chunkLayouts,
          chunkInfo: {
            index: Math.floor(i / layoutsPerChunk),
            total: Math.ceil(totalLayouts / layoutsPerChunk),
            start: i,
            end: Math.min(i + layoutsPerChunk, totalLayouts),
            isFirst: i === 0,
            isLast: i + layoutsPerChunk >= totalLayouts
          }
        };
        chunks.push(JSON.stringify(chunkData, null, 2));
      }
    } else {
      // For other JSON, chunk by lines
      const jsonString = JSON.stringify(json, null, 2);
      const lines = jsonString.split('\n');

      for (let i = 0; i < lines.length; i += maxLines) {
        const chunkLines = lines.slice(i, Math.min(i + maxLines, lines.length));

        // Ensure we don't break in the middle of an object
        let chunkText = chunkLines.join('\n');

        // Add metadata about position
        const metadata = {
          chunkIndex: Math.floor(i / maxLines),
          totalChunks: Math.ceil(lines.length / maxLines),
          isFirst: i === 0,
          isLast: i + maxLines >= lines.length
        };

        chunks.push(JSON.stringify({
          partial: chunkText,
          metadata
        }, null, 2));
      }
    }

    return chunks;
  };

  const processChunk = async (chunk: Chunk, previousResult?: string): Promise<string> => {
    const chunkData = JSON.parse(chunk.content);
    const isFirst = chunkData.chunkInfo?.isFirst || chunkData.metadata?.isFirst;
    const isLast = chunkData.chunkInfo?.isLast || chunkData.metadata?.isLast;

    // Build prompt based on chunk position
    let prompt = '';

    if (isFirst) {
      prompt = `Create the HTML header and beginning of a website based on this Figma data.
      Include <!DOCTYPE html>, <head> with styles, and opening <body> tag.

      First set of elements:
      ${JSON.stringify(chunkData.layouts || chunkData, null, 2).substring(0, 2000)}

      Start building the page structure.`;
    } else if (isLast) {
      prompt = `Complete the HTML with the final section and closing tags.

      Previous HTML context (last 500 chars):
      ${previousResult?.slice(-500)}

      Final elements to add:
      ${JSON.stringify(chunkData.layouts || chunkData, null, 2).substring(0, 2000)}

      Close all tags properly with </body></html>.`;
    } else {
      prompt = `Continue building the HTML. Add the next section.

      Previous HTML context (last 500 chars):
      ${previousResult?.slice(-500)}

      Next elements to add:
      ${JSON.stringify(chunkData.layouts || chunkData, null, 2).substring(0, 2000)}

      Output ONLY the new HTML section to add, no tags that were already created.`;
    }

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          browserData: {
            isWebBuilder: true,
            targetFile: 'chunk.html',
            chunkMode: true,
            isFirstChunk: isFirst,
            isLastChunk: isLast
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process chunk: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.message || '';
    } catch (error) {
      console.error('Error processing chunk:', error);
      throw error;
    }
  };

  const startProcessing = async () => {
    try {
      const jsonData = JSON.parse(jsonInput);
      const jsonChunks = chunkJSON(jsonData);

      // Create chunk objects
      const chunkObjects: Chunk[] = jsonChunks.map((content, index) => ({
        id: index,
        content,
        status: 'pending'
      }));

      setChunks(chunkObjects);
      setIsProcessing(true);

      let accumulatedHTML = '';

      // Process chunks sequentially
      for (let i = 0; i < chunkObjects.length; i++) {
        setCurrentChunk(i);

        // Update chunk status
        setChunks(prev => prev.map(c =>
          c.id === i ? { ...c, status: 'processing' } : c
        ));

        try {
          const result = await processChunk(chunkObjects[i], accumulatedHTML);

          // Merge results intelligently
          if (i === 0) {
            accumulatedHTML = result;
          } else if (chunkObjects[i].content.includes('"isLast": true')) {
            // For last chunk, append before closing body
            const bodyCloseIndex = accumulatedHTML.lastIndexOf('</body>');
            if (bodyCloseIndex > -1) {
              accumulatedHTML =
                accumulatedHTML.slice(0, bodyCloseIndex) +
                result +
                (result.includes('</body>') ? '' : '</body></html>');
            } else {
              accumulatedHTML += result;
            }
          } else {
            // For middle chunks, insert before closing body if exists
            const bodyCloseIndex = accumulatedHTML.lastIndexOf('</body>');
            if (bodyCloseIndex > -1) {
              accumulatedHTML =
                accumulatedHTML.slice(0, bodyCloseIndex) +
                result +
                accumulatedHTML.slice(bodyCloseIndex);
            } else {
              accumulatedHTML += result;
            }
          }

          // Update chunk status and result
          setChunks(prev => prev.map(c =>
            c.id === i ? { ...c, status: 'completed', result } : c
          ));

          setFinalHTML(accumulatedHTML);

          // Small delay between chunks
          if (i < chunkObjects.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          setChunks(prev => prev.map(c =>
            c.id === i ? { ...c, status: 'error' } : c
          ));
          console.error(`Failed to process chunk ${i}:`, error);
          // Continue with next chunk even if one fails
        }
      }

    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Invalid JSON input');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: Chunk['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚡';
      case 'completed': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">JSON Chunker for Figma Data</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Input Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Input JSON</h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your Figma JSON here..."
            className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm"
            disabled={isProcessing}
          />

          <button
            onClick={startProcessing}
            disabled={isProcessing || !jsonInput}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? `Processing Chunk ${currentChunk + 1}/${chunks.length}...` : 'Start Processing'}
          </button>
        </div>

        {/* Chunks Status */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Processing Status</h3>
          <div className="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto">
            {chunks.length === 0 ? (
              <p className="text-gray-500">No chunks yet. Paste JSON and click 'Start Processing'</p>
            ) : (
              <div className="space-y-2">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className={`p-2 rounded flex items-center justify-between ${
                      chunk.status === 'processing' ? 'bg-yellow-100' :
                      chunk.status === 'completed' ? 'bg-green-100' :
                      chunk.status === 'error' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}
                  >
                    <span>Chunk {chunk.id + 1}</span>
                    <span>{getStatusIcon(chunk.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Output Section */}
      {finalHTML && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Generated HTML</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Code</h4>
              <textarea
                value={finalHTML}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Preview</h4>
              <iframe
                srcDoc={finalHTML}
                className="w-full h-64 border border-gray-300 rounded-lg bg-white"
                sandbox="allow-scripts"
              />
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(finalHTML);
              alert('HTML copied to clipboard!');
            }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Copy HTML
          </button>
        </div>
      )}
    </div>
  );
};

export default JsonChunker;