import React, { useState, useRef, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';
import Editor from '@monaco-editor/react';
import AIAssistant from './AIAssistant';
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
  projectType?: 'static' | 'astro' | 'react' | 'vue' | 'svelte';
  packageJson?: any;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  files: { [path: string]: string };
  packageJson?: any;
  commands?: {
    install?: string;
    dev?: string;
    build?: string;
  };
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'static',
    name: 'Static Website',
    description: 'Simple HTML, CSS, and JavaScript',
    icon: 'fa-file-code',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Welcome to My Website</h1>
    <script src="script.js"></script>
</body>
</html>`,
      'styles.css': `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}`,
      'script.js': `console.log('Website loaded!');`
    }
  },
  {
    id: 'astro',
    name: 'Astro Site',
    description: 'Modern static site with Astro',
    icon: 'fa-rocket',
    files: {
      'package.json': JSON.stringify({
        name: 'astro-project',
        type: 'module',
        version: '0.0.1',
        scripts: {
          dev: 'astro dev',
          start: 'astro dev',
          build: 'astro build',
          preview: 'astro preview'
        },
        dependencies: {
          astro: '^4.0.0'
        }
      }, null, 2),
      'astro.config.mjs': `import { defineConfig } from 'astro/config';

export default defineConfig({});`,
      'src/pages/index.astro': `---
const pageTitle = "Welcome to Astro";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>{pageTitle}</title>
  </head>
  <body>
    <h1>{pageTitle}</h1>
    <p>Your new Astro site is ready!</p>
  </body>
</html>

<style>
  body {
    font-family: system-ui;
    margin: 0;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: white;
  }
</style>`
    },
    packageJson: {
      name: 'astro-project',
      type: 'module',
      version: '0.0.1',
      scripts: {
        dev: 'astro dev',
        start: 'astro dev',
        build: 'astro build',
        preview: 'astro preview'
      },
      dependencies: {
        astro: '^4.0.0'
      }
    },
    commands: {
      install: 'npm install',
      dev: 'npm run dev'
    }
  },
  {
    id: 'react',
    name: 'React App',
    description: 'Single-page app with React and Vite',
    icon: 'fa-atom',
    files: {
      'package.json': JSON.stringify({
        name: 'react-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.0.0',
          vite: '^5.0.0'
        }
      }, null, 2),
      'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      'src/App.jsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>React + Vite</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App`,
      'src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}`,
      'src/index.css': `body {
  margin: 0;
  font-family: system-ui;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}`
    },
    packageJson: {
      name: 'react-app',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^5.0.0'
      }
    },
    commands: {
      install: 'npm install',
      dev: 'npm run dev'
    }
  },
  {
    id: 'vue',
    name: 'Vue App',
    description: 'Single-page app with Vue 3',
    icon: 'fa-vuejs fab',
    files: {
      'package.json': JSON.stringify({
        name: 'vue-app',
        version: '0.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          vue: '^3.3.0'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.0.0',
          vite: '^5.0.0'
        }
      }, null, 2),
      'vite.config.js': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`,
      'src/main.js': `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,
      'src/App.vue': `<template>
  <div>
    <h1>{{ msg }}</h1>
    <button @click="count++">Count is: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const msg = 'Hello Vue 3!'
const count = ref(0)
</script>

<style scoped>
div {
  text-align: center;
  padding: 2rem;
}
</style>`
    },
    commands: {
      install: 'npm install',
      dev: 'npm run dev'
    }
  }
];

const AIBuilderWithContainer: React.FC = () => {
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [bootStatus, setBootStatus] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('static');
  const [isInstalling, setIsInstalling] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [project, setProject] = useState<Project>({
    name: 'my-project',
    files: [],
    activeFile: null,
    projectType: 'static'
  });
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [activePanel, setActivePanel] = useState<'editor' | 'preview' | 'webcontainer'>('preview');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const bootWebContainer = async () => {
    if (webcontainerInstance || isBooting) return;

    setIsBooting(true);
    setBootStatus('Starting WebContainer...');

    try {
      const instance = await WebContainer.boot();
      setWebcontainerInstance(instance);

      // Set up terminal output
      instance.on('server-ready', (port, url) => {
        console.log('Server ready on port:', port);
        setPreviewUrl(url);
        addTerminalLine(`Server running at ${url}`);
      });

      setBootStatus('WebContainer ready!');
      addTerminalLine('WebContainer booted successfully');

      // Mount initial files if template selected
      if (selectedTemplate) {
        await initializeTemplate(instance, selectedTemplate);
      }

      setIsBooting(false);
    } catch (error) {
      console.error('Failed to boot WebContainer:', error);
      setBootStatus('Failed to start WebContainer');
      setIsBooting(false);
    }
  };

  const initializeTemplate = async (container: WebContainer, templateId: string) => {
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    addTerminalLine(`Initializing ${template.name} template...`);

    // Mount files
    for (const [path, content] of Object.entries(template.files)) {
      await container.fs.writeFile(path, content);
      addTerminalLine(`Created ${path}`);
    }

    // Run install if needed
    if (template.commands?.install) {
      setIsInstalling(true);
      addTerminalLine(`Running: ${template.commands.install}`);

      const installProcess = await container.spawn('sh', ['-c', template.commands.install]);

      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          addTerminalLine(data);
        }
      }));

      const exitCode = await installProcess.exit;

      if (exitCode === 0) {
        addTerminalLine('Dependencies installed successfully!');

        // Start dev server if available
        if (template.commands?.dev) {
          addTerminalLine(`Starting dev server: ${template.commands.dev}`);
          const devProcess = await container.spawn('sh', ['-c', template.commands.dev]);

          devProcess.output.pipeTo(new WritableStream({
            write(data) {
              addTerminalLine(data);
            }
          }));
        }
      } else {
        addTerminalLine(`Installation failed with exit code ${exitCode}`);
      }

      setIsInstalling(false);
    }

    // Update project files for file explorer
    const files = await buildFileTree(container, '/');
    setProject(prev => ({
      ...prev,
      files,
      projectType: templateId as any
    }));
  };

  const buildFileTree = async (container: WebContainer, path: string): Promise<FileNode[]> => {
    const entries = await container.fs.readdir(path, { withFileTypes: true });
    const files: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push({
          name: entry.name,
          type: 'folder',
          path: fullPath,
          children: await buildFileTree(container, fullPath)
        });
      } else if (entry.isFile()) {
        const content = await container.fs.readFile(fullPath, 'utf-8');
        files.push({
          name: entry.name,
          type: 'file',
          path: fullPath,
          content: content
        });
      }
    }

    return files;
  };

  const addTerminalLine = (line: string) => {
    setTerminalOutput(prev => [...prev, line]);
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setProject(prev => ({ ...prev, activeFile: file }));
  };

  const handleCodeChange = async (value: string | undefined) => {
    if (!value || !selectedFile || !webcontainerInstance) return;

    // Update local state
    const updatedFile = { ...selectedFile, content: value };
    setSelectedFile(updatedFile);

    // Update WebContainer file system
    await webcontainerInstance.fs.writeFile(selectedFile.path, value);

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

    setProject(prev => ({
      ...prev,
      files: updateFileInTree(prev.files)
    }));
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
      astro: 'astro',
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
          <p className="text-lg">Loading AI Builder with WebContainer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0a0a] text-gray-300">
      {/* Left Sidebar - AI Assistant */}
      <div className="w-96 bg-[#1a1a1a] border-r border-gray-800 flex flex-col">
        <AIAssistant
          project={project}
          setProject={setProject}
          selectedFile={selectedFile}
          onFirstMessage={() => {}}
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
                onClick={() => setActivePanel('webcontainer')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'webcontainer'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-cube mr-2"></i>Container
              </button>
            </div>

            {/* Template Selector */}
            {!webcontainerInstance && (
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <i className="fas fa-magic mr-2"></i>Choose Template
              </button>
            )}

            {/* Boot WebContainer Button */}
            {!webcontainerInstance && !isBooting && (
              <button
                onClick={bootWebContainer}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <i className="fas fa-play mr-2"></i>Start WebContainer
              </button>
            )}

            {/* Status */}
            {isBooting && (
              <span className="text-sm text-yellow-400">
                <i className="fas fa-spinner fa-spin mr-2"></i>{bootStatus}
              </span>
            )}

            {webcontainerInstance && (
              <span className="text-sm text-green-400">
                <i className="fas fa-check-circle mr-2"></i>Container Running
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer - Show in editor view when WebContainer is running */}
          {activePanel === 'editor' && webcontainerInstance && (
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
                {webcontainerInstance ? (
                  selectedFile && (
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
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <i className="fas fa-cube text-4xl mb-4"></i>
                      <p>Start WebContainer to edit files</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Panel */}
            {activePanel === 'preview' && (
              <div className="w-full h-full">
                {webcontainerInstance && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Preview"
                  />
                ) : project.files.length > 0 ? (
                  <PreviewPane
                    project={project}
                    key={`${project.name}-${project.files.length}`}
                    onConsoleOutput={(msg) => addTerminalLine(msg)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <i className="fas fa-eye text-4xl mb-4"></i>
                      <p>No preview available</p>
                      <p className="text-sm mt-2">Choose a template to get started</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WebContainer Terminal */}
            {activePanel === 'webcontainer' && (
              <div className="w-full h-full bg-black p-4 flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400">
                    <i className="fas fa-terminal mr-2"></i>WebContainer Terminal
                  </h3>
                  <button
                    onClick={() => setTerminalOutput([])}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    <i className="fas fa-trash mr-1"></i>Clear
                  </button>
                </div>
                <div
                  ref={terminalRef}
                  className="flex-1 bg-gray-900 rounded p-3 overflow-y-auto font-mono text-sm text-green-400"
                >
                  {terminalOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">{line}</div>
                  ))}
                  {isInstalling && (
                    <div className="text-yellow-400">
                      <i className="fas fa-spinner fa-spin mr-2"></i>Installing dependencies...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 w-full max-w-4xl mx-4 max-h-[80vh] border border-gray-700 shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                <i className="fas fa-magic mr-2"></i>Choose a Project Template
              </h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {PROJECT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowTemplateSelector(false);
                      if (!webcontainerInstance) {
                        bootWebContainer();
                      } else {
                        initializeTemplate(webcontainerInstance, template.id);
                      }
                    }}
                    className={`p-4 border rounded-lg transition-all text-left ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                    }`}
                  >
                    <i className={`fas ${template.icon} text-2xl mb-2 text-blue-400`}></i>
                    <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBuilderWithContainer;