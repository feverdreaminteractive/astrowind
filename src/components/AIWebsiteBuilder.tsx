import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  path: string;
}

const AIWebsiteBuilder: React.FC = () => {
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update preview when code changes
  useEffect(() => {
    if (iframeRef.current && selectedFile?.name.endsWith('.html')) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(code);
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

  // Generate code using AI
  const generateCode = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert web developer. Generate clean, modern HTML/CSS/JS code based on the user request. Return only the code without explanations.'
            },
            {
              role: 'user',
              content: `Current code:\n${code}\n\nRequest: ${prompt}\n\nGenerate the updated HTML code.`
            }
          ],
          max_tokens: 4000
        }),
      });

      if (!response.ok) throw new Error('Failed to generate code');

      const data = await response.json();
      const generatedCode = data.content[0].text;
      handleCodeChange(generatedCode);
      setPrompt('');
    } catch (error) {
      console.error('Error generating code:', error);
      alert('Failed to generate code. Please try again.');
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
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating...
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

// Mount the component
if (typeof window !== 'undefined') {
  const container = document.getElementById('ai-builder-root');
  if (container) {
    const root = createRoot(container);
    root.render(<AIWebsiteBuilder />);
  }
}

export default AIWebsiteBuilder;