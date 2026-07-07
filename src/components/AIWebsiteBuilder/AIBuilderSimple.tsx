import React, { useState, useEffect } from 'react';
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
  projectType?: string;
}

const PROJECT_TEMPLATES = [
  {
    id: 'static',
    name: 'Static Website',
    description: 'HTML, CSS, JavaScript',
    icon: 'fa-file-code',
    initialFiles: [
      {
        name: 'index.html',
        type: 'file' as const,
        path: '/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>Start editing to see changes!</p>
    <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: 'styles.css',
        type: 'file' as const,
        path: '/styles.css',
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

h1 {
  text-align: center;
  font-size: 3rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}`
      },
      {
        name: 'script.js',
        type: 'file' as const,
        path: '/script.js',
        content: `console.log('Website loaded!');

// Add interactivity here
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready!');
});`
      }
    ]
  },
  {
    id: 'astro',
    name: 'Astro Blog',
    description: 'Static blog with Astro',
    icon: 'fa-rocket',
    initialFiles: [
      {
        name: 'index.html',
        type: 'file' as const,
        path: '/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Astro Blog</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <a href="/" class="logo">My Blog</a>
            <ul>
                <li><a href="#posts">Posts</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="hero">
            <h1>Welcome to My Astro Blog</h1>
            <p>Thoughts on web development, design, and technology</p>
        </section>

        <section id="posts" class="posts">
            <h2>Latest Posts</h2>
            <article class="post-card">
                <h3>Getting Started with Astro</h3>
                <p>Learn how to build fast, modern websites with Astro...</p>
                <a href="#">Read more →</a>
            </article>
            <article class="post-card">
                <h3>The Power of Static Sites</h3>
                <p>Why static site generators are making a comeback...</p>
                <a href="#">Read more →</a>
            </article>
        </section>
    </main>

    <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: 'styles.css',
        type: 'file' as const,
        path: '/styles.css',
        content: `:root {
  --primary: #5e72e4;
  --secondary: #825ee4;
  --text: #333;
  --bg: #f8f9fa;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

header {
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
}

nav ul {
  list-style: none;
  display: flex;
  gap: 2rem;
}

nav a {
  color: var(--text);
  text-decoration: none;
  transition: color 0.3s;
}

nav a:hover {
  color: var(--primary);
}

.hero {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 6rem 2rem;
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.posts {
  max-width: 1200px;
  margin: 4rem auto;
  padding: 0 2rem;
}

.posts h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: var(--primary);
}

.post-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform 0.3s, box-shadow 0.3s;
}

.post-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.post-card h3 {
  color: var(--primary);
  margin-bottom: 1rem;
}

.post-card a {
  color: var(--secondary);
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  margin-top: 1rem;
}`
      },
      {
        name: 'script.js',
        type: 'file' as const,
        path: '/script.js',
        content: `// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Add animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all post cards
document.querySelectorAll('.post-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.5s, transform 0.5s';
  observer.observe(card);
});`
      }
    ]
  },
  {
    id: 'react',
    name: 'React App',
    description: 'Interactive React application',
    icon: 'fa-atom',
    initialFiles: [
      {
        name: 'index.html',
        type: 'file' as const,
        path: '/index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="root">
        <div class="app">
            <header class="app-header">
                <h1>⚛️ React Counter App</h1>
                <div class="counter">
                    <button class="btn btn-dec">-</button>
                    <span class="count">0</span>
                    <button class="btn btn-inc">+</button>
                </div>
                <button class="btn btn-reset">Reset</button>
            </header>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: 'styles.css',
        type: 'file' as const,
        path: '/styles.css',
        content: `.app {
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #61dafb, #282c34);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.app-header h1 {
  font-size: 3rem;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.counter {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  background: rgba(255,255,255,0.1);
  padding: 1rem 2rem;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.count {
  font-size: 4rem;
  font-weight: bold;
  min-width: 100px;
}

.btn {
  background: white;
  color: #282c34;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}

.btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.btn:active {
  transform: scale(0.95);
}

.btn-dec, .btn-inc {
  width: 60px;
  height: 60px;
  font-size: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-reset {
  background: #ff6b6b;
  color: white;
}

.btn-reset:hover {
  background: #ff5252;
}`
      },
      {
        name: 'script.js',
        type: 'file' as const,
        path: '/script.js',
        content: `// React-style counter app in vanilla JS
let count = 0;

const countElement = document.querySelector('.count');
const incButton = document.querySelector('.btn-inc');
const decButton = document.querySelector('.btn-dec');
const resetButton = document.querySelector('.btn-reset');

function updateCount() {
  countElement.textContent = count;
  countElement.style.color = count > 0 ? '#4caf50' : count < 0 ? '#f44336' : 'white';
}

incButton.addEventListener('click', () => {
  count++;
  updateCount();
});

decButton.addEventListener('click', () => {
  count--;
  updateCount();
});

resetButton.addEventListener('click', () => {
  count = 0;
  updateCount();
});

// Initialize
updateCount();`
      }
    ]
  }
];

const AIBuilderSimple: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [project, setProject] = useState<Project>({
    name: 'my-project',
    files: [],
    activeFile: null
  });
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [activePanel, setActivePanel] = useState<'editor' | 'preview'>('preview');
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadTemplate = (templateId: string) => {
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newProject: Project = {
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      files: template.initialFiles,
      activeFile: template.initialFiles[0] || null,
      projectType: templateId
    };

    setProject(newProject);
    setSelectedFile(template.initialFiles[0] || null);
    setShowTemplateSelector(false);
    setActivePanel('preview');
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setProject(prev => ({ ...prev, activeFile: file }));
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!value || !selectedFile) return;

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
      md: 'markdown'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  if (!isMounted) {
    return (
      <div className="flex h-full bg-gray-900 text-gray-300 items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4 block"></i>
          <p className="text-lg">Loading AI Builder...</p>
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
          onFirstMessage={() => setShowTemplateSelector(false)}
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
            </div>

            {/* Template Button */}
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <i className="fas fa-magic mr-2"></i>Templates
            </button>
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
              <div className="w-full h-full">
                {project.files.length > 0 ? (
                  <PreviewPane
                    project={project}
                    key={`${project.name}-${JSON.stringify(project.files.map(f => f.content))}`}
                    onConsoleOutput={() => {}}
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
              {project.files.length > 0 && (
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROJECT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => loadTemplate(template.id)}
                    className="p-6 border rounded-lg transition-all text-left border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 group"
                  >
                    <i className={`fas ${template.icon} text-3xl mb-3 text-blue-400 group-hover:text-blue-300`}></i>
                    <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  <i className="fas fa-info-circle mr-2"></i>
                  Select a template to start building. You can customize everything after loading.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBuilderSimple;