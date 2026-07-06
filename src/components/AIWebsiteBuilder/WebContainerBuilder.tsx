import React, { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import MonacoEditor from '@monaco-editor/react';

interface Props {
  onClose: () => void;
}

interface FileNode {
  file?: {
    contents: string;
  };
  directory?: {
    [name: string]: FileNode;
  };
}

const WebContainerBuilder: React.FC<Props> = ({ onClose }) => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    {
      role: 'assistant',
      content: "I can build full-stack Node.js applications! Tell me what to create:\n• Express API with database\n• React/Vue/Angular apps\n• Full e-commerce platform\n• SaaS dashboard\n• Any Node.js project!"
    }
  ]);
  const [input, setInput] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initWebContainer = async () => {
      try {
        const instance = await WebContainer.boot();
        setWebcontainerInstance(instance);

        // Mount initial file system
        await instance.mount({
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: 'ai-project',
                version: '1.0.0',
                scripts: {
                  start: 'node index.js',
                  dev: 'nodemon index.js'
                }
              }, null, 2)
            }
          },
          'index.js': {
            file: {
              contents: `console.log('WebContainer ready!');`
            }
          }
        });

        // Listen to server ready events
        instance.on('server-ready', (port, url) => {
          if (iframeRef.current) {
            iframeRef.current.src = url;
          }
        });

        setFiles(['package.json', 'index.js']);
      } catch (error) {
        console.error('Failed to boot WebContainer:', error);
      }
    };

    initWebContainer();
  }, []);

  const runCommand = async (command: string) => {
    if (!webcontainerInstance) return;

    const process = await webcontainerInstance.spawn(command.split(' ')[0], command.split(' ').slice(1));

    process.output.pipeTo(new WritableStream({
      write(data) {
        setTerminalOutput(prev => [...prev, data]);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }
    }));

    return process.exit;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:9999/.netlify/functions/claude'
        : '/.netlify/functions/claude';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          browserData: {
            isWebContainer: true,
            isWebBuilder: true,
            hasNodeRuntime: true,
            url: window.location.href
          }
        })
      });

      const data = await response.json();
      const responseText = data.response || '';

      // Parse response for files
      const jsonStartIdx = responseText.indexOf('<<<JSON_START>>>');
      const jsonEndIdx = responseText.indexOf('<<<JSON_END>>>');

      if (jsonStartIdx !== -1 && jsonEndIdx !== -1) {
        const message = responseText.substring(0, jsonStartIdx).trim();
        const jsonStr = responseText.substring(jsonStartIdx + 16, jsonEndIdx).trim();

        try {
          const projectData = JSON.parse(jsonStr);

          // Build file system structure for WebContainer
          const fileSystem: FileNode = {};

          for (const file of projectData.files) {
            const pathParts = file.name.split('/');
            let current: any = fileSystem;

            for (let i = 0; i < pathParts.length - 1; i++) {
              if (!current[pathParts[i]]) {
                current[pathParts[i]] = { directory: {} };
              }
              current = current[pathParts[i]].directory;
            }

            current[pathParts[pathParts.length - 1]] = {
              file: { contents: file.content }
            };
          }

          // Mount the files to WebContainer
          if (webcontainerInstance) {
            await webcontainerInstance.mount(fileSystem);
            setFiles(projectData.files.map((f: any) => f.name));

            // Auto-run npm install if package.json exists
            if (projectData.files.some((f: any) => f.name === 'package.json')) {
              setTerminalOutput(prev => [...prev, '> npm install']);
              await runCommand('npm install');
            }

            // Auto-start the dev server
            if (projectData.files.some((f: any) => f.name === 'package.json')) {
              const pkgFile = projectData.files.find((f: any) => f.name === 'package.json');
              const pkg = JSON.parse(pkgFile.content);
              if (pkg.scripts?.start) {
                setTerminalOutput(prev => [...prev, '> npm start']);
                await runCommand('npm start');
              } else if (pkg.scripts?.dev) {
                setTerminalOutput(prev => [...prev, '> npm run dev']);
                await runCommand('npm dev');
              }
            }
          }

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message || `Created ${projectData.files.length} files! Check the terminal for build output.`
          }]);

          // Select first file
          if (projectData.files.length > 0) {
            setSelectedFile(projectData.files[0].name);
            setFileContent(projectData.files[0].content);
          }
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error connecting to AI. Please try again.'
      }]);
    }

    setIsLoading(false);
  };

  const readFile = async (path: string) => {
    if (!webcontainerInstance) return '';

    try {
      const file = await webcontainerInstance.fs.readFile(path, 'utf-8');
      return file;
    } catch {
      return '';
    }
  };

  const writeFile = async (path: string, content: string) => {
    if (!webcontainerInstance) return;

    try {
      await webcontainerInstance.fs.writeFile(path, content);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  };

  const selectFile = async (filename: string) => {
    setSelectedFile(filename);
    const content = await readFile(filename);
    setFileContent(content);
  };

  const saveCurrentFile = async () => {
    if (selectedFile) {
      await writeFile(selectedFile, fileContent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">AI Full-Stack Builder (Node.js Runtime)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Panel */}
          <div className="w-96 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-200 rounded-lg px-4 py-2">
                    <span className="animate-pulse">Building your project...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Describe your Node.js app..."
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading || !webcontainerInstance}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !webcontainerInstance}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Build
                </button>
              </div>
            </div>
          </div>

          {/* File Explorer */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300">FILES</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {files.map((file) => (
                <button
                  key={file}
                  onClick={() => selectFile(file)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                    selectedFile === file ? 'bg-gray-700 text-white' : 'text-gray-400'
                  }`}
                >
                  📄 {file}
                </button>
              ))}
            </div>
          </div>

          {/* Editor and Preview */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex">
              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                {selectedFile && (
                  <>
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
                      <span className="text-sm text-gray-300">{selectedFile}</span>
                      <button
                        onClick={saveCurrentFile}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                    <div className="flex-1">
                      <MonacoEditor
                        value={fileContent}
                        onChange={(value) => setFileContent(value || '')}
                        language={
                          selectedFile.endsWith('.js') ? 'javascript' :
                          selectedFile.endsWith('.json') ? 'json' :
                          selectedFile.endsWith('.html') ? 'html' :
                          selectedFile.endsWith('.css') ? 'css' :
                          'plaintext'
                        }
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Preview */}
              <div className="w-1/2 border-l border-gray-700 bg-white">
                <iframe
                  ref={iframeRef}
                  className="w-full h-full"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>

            {/* Terminal */}
            <div className="h-48 bg-black border-t border-gray-700 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
                <span className="text-sm text-gray-300">TERMINAL</span>
                <button
                  onClick={() => setTerminalOutput([])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400">
                {terminalOutput.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebContainerBuilder;