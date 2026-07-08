import React, { useState, useRef, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';
import Editor from '@monaco-editor/react';
import AIAssistantEnhanced from './AIAssistantEnhanced';
import FileExplorer from './FileExplorer';
import PreviewPane from './PreviewPane';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  path: string;
  language?: string;
}

export interface Project {
  name: string;
  files: FileNode[];
  activeFile: FileNode | null;
  projectType?: string;
  setupCommands?: string[];
  devServerPort?: number;
  devServerUrl?: string;
}

const AIBuilderPro: React.FC = () => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [bootStatus, setBootStatus] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [project, setProject] = useState<Project>({
    name: 'my-project',
    files: [],
    activeFile: null
  });
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [activePanel, setActivePanel] = useState<'editor' | 'preview' | 'terminal'>('preview');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const bootWebContainer = async () => {
    if (webcontainerInstance || isBooting) return;

    setIsBooting(true);
    setBootStatus('Starting WebContainer...');
    addTerminalLine('🚀 Starting WebContainer...');

    try {
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      // Set up server-ready event
      instance.on('server-ready', (port, url) => {
        console.log('Server ready on port:', port, 'url:', url);
        setPreviewUrl(url);
        addTerminalLine(`✅ Server running at ${url}`);
      });

      // Sync files from project to WebContainer
      if (project.files.length > 0) {
        await syncFilesToWebContainer(instance, project.files);

        // Check for package.json and run setup commands
        const findPackageJson = (files: FileNode[]): boolean => {
          for (const file of files) {
            if (file.name === 'package.json' || file.path === '/package.json') {
              return true;
            }
            if (file.children) {
              if (findPackageJson(file.children)) return true;
            }
          }
          return false;
        };

        if (findPackageJson(project.files)) {
          // Use project's setup commands or defaults
          const setupCommands = project.setupCommands || ['npm install', 'npm run dev'];

          addTerminalLine('📦 Running setup commands...');

          for (const command of setupCommands) {
            addTerminalLine(`🔧 Executing: ${command}`);
            const [cmd, ...args] = command.split(' ');

            try {
              const process = await instance.spawn(cmd, args);

              process.output.pipeTo(new WritableStream({
                write(data) {
                  addTerminalLine(data);
                }
              }));

              // Don't wait for dev server to exit (it runs indefinitely)
              if (!command.includes('dev') && !command.includes('start')) {
                const exitCode = await process.exit;
                if (exitCode !== 0) {
                  addTerminalLine(`Process exited with code ${exitCode}`);
                }
              }
            } catch (error) {
              addTerminalLine(`❌ Error: ${error}`);
            }
          }

          if (project.devServerUrl) {
            addTerminalLine(`✨ Dev server should be available at: ${project.devServerUrl}`);
          }
        }
      }

      setBootStatus('WebContainer ready!');
      addTerminalLine('✅ WebContainer booted successfully');
      setIsBooting(false);
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      setBootStatus('Failed to start WebContainer');
      addTerminalLine(`❌ Error: ${error}`);
      setIsBooting(false);
    }
  };

  const syncFilesToWebContainer = async (container: WebContainer, files: FileNode[], basePath = '') => {
    for (const file of files) {
      const fullPath = basePath ? `${basePath}/${file.name}` : file.name;

      if (file.type === 'folder') {
        // Create directory
        await container.fs.mkdir(fullPath, { recursive: true });
        // Process children
        if (file.children) {
          await syncFilesToWebContainer(container, file.children, fullPath);
        }
      } else if (file.type === 'file' && file.content) {
        // Write file
        await container.fs.writeFile(fullPath, file.content);
        addTerminalLine(`📝 Created ${fullPath}`);
      }
    }
  };

  const runCommand = async (command: string) => {
    if (!webcontainerInstance) {
      addTerminalLine('❌ WebContainer not running. Start it first.');
      return;
    }

    addTerminalLine(`$ ${command}`);

    try {
      const [cmd, ...args] = command.split(' ');
      const process = await webcontainerInstance.spawn(cmd, args);

      process.output.pipeTo(new WritableStream({
        write(data) {
          addTerminalLine(data);
        }
      }));

      const exitCode = await process.exit;

      if (exitCode !== 0) {
        addTerminalLine(`Process exited with code ${exitCode}`);
      }
    } catch (error) {
      addTerminalLine(`❌ Error: ${error}`);
    }
  };

  const addTerminalLine = (line: string) => {
    setTerminalOutput(prev => [...prev, line]);
    // Auto scroll to bottom
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 10);
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setProject(prev => ({ ...prev, activeFile: file }));
  };

  const handleCodeChange = async (value: string | undefined) => {
    if (!value || !selectedFile) return;

    // Update local state
    const updatedFile = { ...selectedFile, content: value };
    setSelectedFile(updatedFile);

    // Update project files
    const updateFileInTree = (files: FileNode[]): FileNode[] => {
      return files.map(file => {
        if (file.path === selectedFile.path) {
          return updatedFile;
        }
        if (file.children) {
          return { ...file, children: updateFileInTree(file.children) };
        }
        return file;
      });
    };

    const updatedProject = {
      ...project,
      files: updateFileInTree(project.files)
    };
    setProject(updatedProject);

    // Sync to WebContainer if running
    if (webcontainerInstance && selectedFile.path) {
      try {
        const path = selectedFile.path.startsWith('/') ? selectedFile.path.slice(1) : selectedFile.path;
        await webcontainerInstance.fs.writeFile(path, value);
        console.log(`Synced ${path} to WebContainer`);
      } catch (error) {
        console.error('Failed to sync to WebContainer:', error);
      }
    }
  };

  const handleProjectUpdate = async (newProject: Project) => {
    setProject(newProject);

    // If WebContainer is running, sync the new files
    if (webcontainerInstance && newProject.files.length > 0) {
      addTerminalLine('📂 Syncing project files to WebContainer...');
      await syncFilesToWebContainer(webcontainerInstance, newProject.files);

      // Check if package.json exists (check all files recursively)
      const findPackageJson = (files: FileNode[]): boolean => {
        for (const file of files) {
          if (file.name === 'package.json' || file.path === '/package.json') {
            return true;
          }
          if (file.children) {
            if (findPackageJson(file.children)) return true;
          }
        }
        return false;
      };

      const hasPackageJson = findPackageJson(newProject.files);

      if (hasPackageJson) {
        // Use AI-provided setup commands or defaults
        const setupCommands = newProject.setupCommands || ['npm install', 'npm run dev'];

        addTerminalLine('📦 Running AI-provided setup commands...');

        for (const command of setupCommands) {
          addTerminalLine(`🔧 Executing: ${command}`);
          await runCommand(command);
        }

        // If AI provided dev server info, show it
        if (newProject.devServerUrl) {
          addTerminalLine(`✨ Dev server should be available at: ${newProject.devServerUrl}`);
        }
      }
    }
  };

  const getEditorLanguage = (file: FileNode | null) => {
    if (!file) return 'plaintext';
    const ext = file.name.split('.').pop();
    const langMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
      vue: 'vue',
      astro: 'html', // Monaco doesn't have native Astro support
      svelte: 'html',
      mjs: 'javascript',
      cjs: 'javascript'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  if (!isMounted) {
    return (
      <div className="flex h-full bg-gray-900 text-gray-300 items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4 block"></i>
          <p className="text-lg">Loading AI Builder Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0a0a] text-gray-300">
      {/* Left Sidebar - Enhanced AI Assistant */}
      <div className="w-96 bg-[#1a1a1a] border-r border-gray-800 flex flex-col">
        <AIAssistantEnhanced
          project={project}
          setProject={handleProjectUpdate}
          selectedFile={selectedFile}
          onFirstMessage={() => {}}
          webcontainerInstance={webcontainerInstance}
          onWebContainerNeeded={bootWebContainer}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-900 rounded-lg p-0.5">
              <button
                onClick={() => setActivePanel('preview')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'preview'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-eye mr-2"></i>Preview
              </button>
              <button
                onClick={() => setActivePanel('editor')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'editor'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-code mr-2"></i>Code
              </button>
              <button
                onClick={() => setActivePanel('terminal')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'terminal'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-terminal mr-2"></i>Terminal
              </button>
            </div>

            {/* WebContainer Controls */}
            {!webcontainerInstance && !isBooting && (
              <button
                onClick={bootWebContainer}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <i className="fas fa-play mr-2"></i>Start WebContainer
              </button>
            )}

            {isBooting && (
              <span className="text-sm text-yellow-400">
                <i className="fas fa-spinner fa-spin mr-2"></i>{bootStatus}
              </span>
            )}

            {webcontainerInstance && (
              <span className="text-sm text-green-400">
                <i className="fas fa-check-circle mr-2"></i>WebContainer Running
              </span>
            )}
          </div>

          {/* Current File Path */}
          {activePanel === 'editor' && selectedFile && (
            <div className="text-sm text-gray-500 font-mono">
              {selectedFile.path}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer - Show in editor view */}
          {activePanel === 'editor' && project.files.length > 0 && (
            <div className="w-64 bg-[#161616] border-r border-gray-800">
              <FileExplorer
                files={project.files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                project={project}
                setProject={setProject}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Panel */}
            {activePanel === 'editor' && (
              <div className="w-full">
                {selectedFile ? (
                  <Editor
                    theme="vs-dark"
                    language={getEditorLanguage(selectedFile)}
                    value={selectedFile.content}
                    onChange={handleCodeChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <i className="fas fa-code text-4xl mb-4"></i>
                      <p>Select a file to edit</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Panel */}
            {activePanel === 'preview' && (
              <div className="w-full h-full flex flex-col">
                {webcontainerInstance && previewUrl ? (
                  <>
                    {/* URL Bar */}
                    <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const iframe = document.querySelector('iframe');
                          if (iframe) iframe.contentWindow?.location.reload();
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <i className="fas fa-sync-alt"></i>
                      </button>
                      <div className="flex-1 bg-gray-900 rounded-md px-3 py-1.5 text-sm font-mono text-gray-300 flex items-center gap-2">
                        <i className="fas fa-globe text-gray-500 text-xs"></i>
                        <span className="truncate">{previewUrl}</span>
                      </div>
                      <button
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Open in new tab"
                      >
                        <i className="fas fa-external-link-alt"></i>
                      </button>
                    </div>
                    {/* Iframe */}
                    <iframe
                      src={previewUrl}
                      className="flex-1 border-0"
                      title="Preview"
                    />
                  </>
                ) : project.files.length > 0 ? (
                  <PreviewPane
                    project={project}
                    key={`${project.name}-${JSON.stringify(project.files.map(f => f.content))}`}
                    onConsoleOutput={(msg) => addTerminalLine(`[Console] ${msg}`)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <i className="fas fa-eye text-4xl mb-4"></i>
                      <p>No preview available</p>
                      <p className="text-sm mt-2">Ask the AI to create a project</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal Panel */}
            {activePanel === 'terminal' && (
              <div className="w-full h-full bg-black p-4 flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400">
                    <i className="fas fa-terminal mr-2"></i>Terminal
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTerminalOutput([])}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
                    >
                      <i className="fas fa-trash mr-1"></i>Clear
                    </button>
                    {webcontainerInstance && (
                      <button
                        onClick={() => runCommand('npm run dev')}
                        className="text-xs text-green-500 hover:text-green-300 px-2 py-1 rounded hover:bg-gray-800"
                      >
                        <i className="fas fa-play mr-1"></i>Run Dev
                      </button>
                    )}
                  </div>
                </div>

                <div
                  ref={terminalRef}
                  className="flex-1 bg-gray-900 rounded p-3 overflow-y-auto font-mono text-sm text-green-400"
                >
                  {terminalOutput.length === 0 ? (
                    <div className="text-gray-600">
                      {webcontainerInstance
                        ? 'Terminal ready. Commands will appear here...'
                        : 'Start WebContainer to use the terminal.'}
                    </div>
                  ) : (
                    terminalOutput.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )}
                </div>

                {webcontainerInstance && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter command..."
                      className="flex-1 bg-gray-900 text-white rounded px-3 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          if (input.trim()) {
                            runCommand(input);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBuilderPro;