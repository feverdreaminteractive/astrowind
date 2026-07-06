import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import AIAssistant from './AIAssistant';
import FileExplorer from './FileExplorer';
import PreviewPane from './PreviewPane';
import DeploymentPanel from './DeploymentPanel';
import TerminalDrawer from './TerminalDrawer';

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
}

const AIWebsiteBuilder: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [savedProjects, setSavedProjects] = useState<{[key: string]: Project}>({});
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');

  // Initialize project from localStorage or create new
  const [project, setProject] = useState<Project>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiWebBuilder_currentProject');
      if (saved) {
        try {
          const parsedProject = JSON.parse(saved);
          // Only restore if it has files, otherwise start fresh
          if (parsedProject.files && parsedProject.files.length > 0) {
            return parsedProject;
          }
        } catch (e) {
          console.error('Error loading saved project:', e);
        }
      }
    }
    return {
      name: 'my-website',
      files: [],
      activeFile: null
    };
  });

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(project.files[0]);
  const [activePanel, setActivePanel] = useState<'editor' | 'preview'>('preview');
  const [showDeployment, setShowDeployment] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // Handle mounting and load saved projects
  useEffect(() => {
    setIsMounted(true);

    // Load all saved projects from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiWebBuilder_savedProjects');
      if (saved) {
        try {
          setSavedProjects(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading saved projects:', e);
        }
      }
    }
  }, []);

  // Save project to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      // Always save the project state, even if empty (for reset scenarios)
      localStorage.setItem('aiWebBuilder_currentProject', JSON.stringify(project));
    }
  }, [project, isMounted]);

  // Save project to saved projects
  const saveProject = () => {
    const projectName = project.name || 'Untitled Project';
    const timestamp = new Date().toISOString();
    const projectId = `project_${Date.now()}`;

    const updatedSavedProjects = {
      ...savedProjects,
      [projectId]: {
        ...project,
        savedAt: timestamp,
        id: projectId
      }
    };

    setSavedProjects(updatedSavedProjects);
    setCurrentProjectId(projectId);
    localStorage.setItem('aiWebBuilder_savedProjects', JSON.stringify(updatedSavedProjects));

    // Show success notification
    alert(`Project "${projectName}" saved successfully!`);
  };

  // Load a saved project
  const loadProject = (projectId: string) => {
    const savedProject = savedProjects[projectId];
    if (savedProject) {
      setProject(savedProject);
      setCurrentProjectId(projectId);
      setSelectedFile(savedProject.files[0] || null);
      setShowProjectManager(false);
    }
  };

  // Start a new project
  const startNewProject = () => {
    const newProject: Project = {
      name: `project-${Date.now()}`,
      files: [],
      activeFile: null
    };
    setProject(newProject);
    setSelectedFile(null);
    setCurrentProjectId('new');
    setHasStarted(false);
    setShowProjectManager(false);
  };

  // Delete a saved project
  const deleteProject = (projectId: string) => {
    const updatedSavedProjects = { ...savedProjects };
    delete updatedSavedProjects[projectId];
    setSavedProjects(updatedSavedProjects);
    localStorage.setItem('aiWebBuilder_savedProjects', JSON.stringify(updatedSavedProjects));

    // Always reset to start screen when deleting any project
    // This ensures a clean state
    const newProject: Project = {
      name: 'my-website',
      files: [],
      activeFile: null
    };

    // Force immediate state updates
    setProject(newProject);
    setSelectedFile(null);
    setCurrentProjectId('new');
    setHasStarted(false);
    setActivePanel('preview'); // Switch to preview to see the start screen

    // Clear localStorage
    localStorage.removeItem('aiWebBuilder_currentProject');
    // Force a re-render by updating localStorage with empty project
    localStorage.setItem('aiWebBuilder_currentProject', JSON.stringify(newProject));
  };

  // Handle file selection
  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setProject(prev => ({ ...prev, activeFile: file }));
  };

  // Handle code changes
  const handleCodeChange = (value: string | undefined) => {
    if (!value || !selectedFile) return;

    const updateFiles = (files: FileNode[]): FileNode[] => {
      return files.map(file => {
        if (file.path === selectedFile.path) {
          return { ...file, content: value };
        }
        if (file.children) {
          return { ...file, children: updateFiles(file.children) };
        }
        return file;
      });
    };

    setProject(prev => ({
      ...prev,
      files: updateFiles(prev.files)
    }));
  };

  // Get language for Monaco Editor
  const getEditorLanguage = (file: FileNode | null) => {
    if (!file) return 'html';
    const ext = file.name.split('.').pop();
    switch (ext) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'jsx': case 'tsx': return 'javascript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  // Show loading state while mounting
  if (!isMounted) {
    return (
      <div className="flex h-full bg-gray-900 text-gray-300 items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4 block"></i>
          <p className="text-lg">Loading AI Website Builder...</p>
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
        {/* Top Toolbar - Outside of the flex layout so it doesn't move */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center justify-between h-12">
          {/* View toggle buttons - fixed position */}
          <div className="flex items-center">
            <div className="flex bg-gray-900 rounded-lg p-0.5">
              <button
                onClick={() => setActivePanel('preview')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'preview'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-eye mr-2"></i>Preview
              </button>
              <button
                onClick={() => setActivePanel('editor')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activePanel === 'editor'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-code mr-2"></i>Code
              </button>
            </div>
          </div>

          {/* Center - Current file path (only in editor view) */}
          <div className="flex-1 flex justify-center">
            {activePanel === 'editor' && selectedFile && (
              <div className="text-sm text-gray-500 font-mono">
                {selectedFile.path}
              </div>
            )}
          </div>

          {/* Right - Project actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProjectManager(true)}
              className="px-3 py-1 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors"
              title="Manage Projects"
            >
              <i className="fas fa-folder-open mr-2"></i>
              Projects
            </button>
            {project.files.length > 0 && (
              <button
                onClick={saveProject}
                className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                title="Save Project"
              >
                <i className="fas fa-save mr-2"></i>
                Save
              </button>
            )}
            <button
              onClick={() => setShowDeployment(true)}
              className="px-4 py-1 rounded-md bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-rocket mr-2"></i>
              Publish
            </button>
          </div>
        </div>

        {/* Content Area with File Explorer and Editor/Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer - Only show in Code view */}
          {activePanel === 'editor' && (
            <div className="w-64 bg-[#161616] border-r border-gray-800 flex flex-col">
              <FileExplorer
                files={project.files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                project={project}
                setProject={setProject}
              />
            </div>
          )}

          {/* Main Editor/Preview Area */}
          <div className="flex-1 flex overflow-hidden bg-[#0a0a0a]">
            {/* Code Editor */}
            {activePanel === 'editor' && (
              <div className="w-full">
                {selectedFile && isMounted && (
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
                )}
              </div>
            )}

            {/* Preview */}
            {activePanel === 'preview' && (
              <div className="w-full">
                <PreviewPane
                  project={project}
                  key={`${project.name}-${project.files.length}`} // Force re-render on project change
                  onConsoleOutput={(msg) => setTerminalOutput(prev => [...prev, msg])}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deployment Modal */}
      {showDeployment && (
        <DeploymentPanel
          project={project}
          onClose={() => setShowDeployment(false)}
        />
      )}

      {/* Project Manager Modal */}
      {showProjectManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 w-full max-w-3xl mx-4 max-h-[80vh] border border-gray-700 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                <i className="fas fa-folder-open mr-2"></i>Project Manager
              </h2>
              <button
                onClick={() => setShowProjectManager(false)}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* New Project Button */}
              <button
                onClick={startNewProject}
                className="w-full px-4 py-3 mb-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <i className="fas fa-plus mr-2"></i>
                Start New Project
              </button>

              {/* Saved Projects */}
              {Object.keys(savedProjects).length > 0 ? (
                <div>
                  <h3 className="text-white font-semibold mb-4">Saved Projects</h3>
                  <div className="grid gap-3">
                    {Object.entries(savedProjects).map(([id, proj]) => (
                      <div
                        key={id}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-gray-600 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{proj.name}</h4>
                          <p className="text-gray-400 text-sm">
                            {proj.files.length} files · Saved {new Date((proj as any).savedAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadProject(id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                          >
                            <i className="fas fa-folder-open mr-1"></i>
                            Open
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete project "${proj.name}"?`)) {
                                deleteProject(id);
                                // Keep modal open after deletion so user can start new or load another
                              }
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <i className="fas fa-folder-open text-4xl mb-4 opacity-50"></i>
                  <p>No saved projects yet</p>
                  <p className="text-sm mt-2">Create and save your first project to see it here</p>
                </div>
              )}

              {/* Current Project Status */}
              {project.files.length > 0 && (
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <i className="fas fa-info-circle mr-2"></i>
                    Current project: <strong>{project.name}</strong> ({project.files.length} files)
                    {currentProjectId !== 'new' && currentProjectId !== 'default' && (
                      <span className="text-green-400 ml-2">
                        <i className="fas fa-check-circle mr-1"></i>Saved
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Browser Console Output */}
      {project.files.length > 0 && (
        <TerminalDrawer
          output={terminalOutput}
          onCommand={undefined}
          isRunning={false}
        />
      )}
    </div>
  );
};

export default AIWebsiteBuilder;