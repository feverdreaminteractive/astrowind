import React, { useState, useRef, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';

interface Props {
  project: any;
  setProject: (project: any) => void;
  selectedFile: any;
  onFirstMessage?: () => void;
  webcontainerInstance?: WebContainer | null;
  onWebContainerNeeded?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MESSAGES_STORAGE_KEY = 'aiWebBuilder_chatMessages';
const DRAFT_STORAGE_KEY = 'aiWebBuilder_chatDraft';

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: "I'll help you build any web application.\n\n**I can create:**\n• Full Astro sites with multiple pages\n• React apps with components\n• Vue applications\n• Node.js APIs\n• Complex multi-file projects\n\n**Just describe what you want to build**, and I'll:\n1. Generate the complete file structure\n2. Create all necessary files\n3. Set up package.json with dependencies\n4. Configure the build system\n\nWhat would you like to create?"
};

const AIAssistantEnhanced: React.FC<Props> = ({
  project,
  setProject,
  selectedFile,
  onFirstMessage,
  webcontainerInstance,
  onWebContainerNeeded
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Error loading saved chat messages:', e);
        }
      }
    }
    return [WELCOME_MESSAGE];
  });

  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_STORAGE_KEY) || '';
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(
    () => !messages.some(m => m.role === 'user')
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (input) {
        localStorage.setItem(DRAFT_STORAGE_KEY, input);
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8888/.netlify/functions/claude'
        : '/.netlify/functions/claude';

      // Check if this is a follow-up request (project already exists) or initial creation
      const isFollowUp = project.files.length > 0;

      if (isFollowUp) {
        // Handle follow-up requests - fix errors, add features, etc.
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Working on your request...'
        }]);

        // For follow-ups, send the error/request directly without JSON structure
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            browserData: {
              isWebContainer: true,
              requestType: 'fix_error',
              currentProject: {
                name: project.name,
                files: project.files.map(f => f.path),
                error: userMessage
              }
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get response from AI');
        }

        const data = await response.json();
        const suggestion = data.response || data.message || '';

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: suggestion
        }]);

        // If the AI suggests a specific file to create or modify, handle it
        if (suggestion.includes('create') || suggestion.includes('add') || suggestion.includes('fix')) {
          // Parse the suggestion for file paths and content
          // This is a simplified approach - you might need more sophisticated parsing
          const fileMatch = suggestion.match(/`([^`]+\.[a-z]+)`/);
          if (fileMatch) {
            const filePath = fileMatch[1];
            const contentMatch = suggestion.match(/```[a-z]*\n([\s\S]*?)```/);
            if (contentMatch) {
              const content = contentMatch[1];

              // Add the file to the project
              const newFile = {
                name: filePath.split('/').pop() || 'unknown',
                type: 'file' as const,
                path: filePath.startsWith('/') ? filePath : `/${filePath}`,
                content: content,
                language: 'plaintext'
              };

              // Update project files
              setProject(prev => ({
                ...prev,
                files: [...prev.files, newFile]
              }));

              // Write to WebContainer if available
              if (webcontainerInstance) {
                await webcontainerInstance.fs.writeFile(newFile.path, content);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `✅ Created ${newFile.path}`
                }]);
              }
            }
          }
        }

        setIsLoading(false);
        return;
      }

      // Original code for initial project creation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Analyzing your request and planning the project structure...'
      }]);

      // Send request to AI to get project structure
      const analysisResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          browserData: {
            isWebContainer: true,
            requestType: 'analyze_project',
            systemPrompt: `You are a web development assistant. Analyze the user's request and return a JSON structure describing the project they want to build.

The response must be valid JSON with this structure:
{
  "projectType": "astro|react|vue|svelte|nextjs|nuxt|node|static",
  "projectName": "project-name",
  "description": "Brief description of the project",
  "dependencies": {
    "package-name": "version"
  },
  "devDependencies": {
    "package-name": "version"
  },
  "scripts": {
    "dev": "command",
    "build": "command"
  },
  "files": [
    {
      "path": "/path/to/file.ext",
      "description": "What this file should contain"
    }
  ]
}

Example for an Astro blog:
{
  "projectType": "astro",
  "projectName": "astro-blog",
  "description": "A blog built with Astro",
  "dependencies": {
    "astro": "^4.0.0",
    "@astrojs/mdx": "^2.0.0"
  },
  "devDependencies": {},
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "files": [
    {
      "path": "/package.json",
      "description": "Package configuration with Astro dependencies"
    },
    {
      "path": "/astro.config.mjs",
      "description": "Astro configuration file"
    },
    {
      "path": "/src/pages/index.astro",
      "description": "Homepage with blog post listings"
    },
    {
      "path": "/src/pages/about.astro",
      "description": "About page"
    },
    {
      "path": "/src/layouts/Layout.astro",
      "description": "Base layout component"
    },
    {
      "path": "/src/components/Header.astro",
      "description": "Site header with navigation"
    },
    {
      "path": "/src/styles/global.css",
      "description": "Global styles"
    }
  ]
}`
          }
        })
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze project requirements');
      }

      const analysisData = await analysisResponse.json();
      let projectStructure;

      try {
        // Try to parse the AI response as JSON
        const cleanedResponse = analysisData.response || analysisData.message || '';
        // Remove markdown code blocks if present
        const jsonString = cleanedResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        projectStructure = JSON.parse(jsonString);
      } catch (e) {
        console.error('Failed to parse project structure:', e);
        throw new Error('Could not understand project structure from AI response');
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Creating a ${projectStructure.projectType} project: "${projectStructure.description}"\n\nGenerating ${projectStructure.files.length} files...`
      }]);

      // Now generate each file using AI
      const generatedFiles = [];

      for (const fileSpec of projectStructure.files) {
        const fileName = fileSpec.path.split('/').pop();

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Generating ${fileSpec.path}...`
        }]);

        // Special handling for package.json
        if (fileSpec.path === '/package.json') {
          const packageJson = {
            name: projectStructure.projectName,
            version: '1.0.0',
            type: projectStructure.projectType === 'astro' || projectStructure.projectType === 'node' ? 'module' : undefined,
            scripts: projectStructure.scripts || {},
            dependencies: projectStructure.dependencies || {},
            devDependencies: projectStructure.devDependencies || {}
          };

          generatedFiles.push({
            name: 'package.json',
            type: 'file' as const,
            path: '/package.json',
            language: 'json',
            content: JSON.stringify(packageJson, null, 2)
          });
          continue;
        }

        // Generate other files using AI
        const fileResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            browserData: {
              isWebContainer: true,
              requestType: 'generate_file',
              targetFile: fileSpec.path,
              fileDescription: fileSpec.description,
              projectType: projectStructure.projectType,
              projectContext: {
                description: projectStructure.description,
                otherFiles: projectStructure.files.map(f => f.path)
              },
              systemPrompt: `Generate the content for ${fileSpec.path} in a ${projectStructure.projectType} project.

File purpose: ${fileSpec.description}
Project: ${projectStructure.description}

Return ONLY the raw file content, no markdown formatting or explanations.
For Astro files, use proper Astro syntax with --- frontmatter.
For React/Vue/Svelte, use proper component syntax.
Make sure the code is complete and functional.`
            }
          })
        });

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = (fileData.response || fileData.message || '')
            .replace(/```[a-zA-Z]*\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

          const pathParts = fileSpec.path.split('/').filter(Boolean);
          const fileName = pathParts.pop();
          const dirs = pathParts;

          // Detect language from file extension
          const ext = fileName?.split('.').pop() || '';
          const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'mjs': 'javascript',
            'cjs': 'javascript',
            'vue': 'vue',
            'astro': 'astro',
            'svelte': 'svelte',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
            'mdx': 'markdown',
            'env': 'plaintext'
          };

          generatedFiles.push({
            name: fileName || 'unknown',
            type: 'file' as const,
            path: fileSpec.path,
            language: languageMap[ext] || 'plaintext',
            content: content,
            folders: dirs
          });
        }
      }

      // Create folder structure
      const buildFileTree = (files: any[]): any[] => {
        const tree: any[] = [];
        const folders = new Map();

        // First, create all folders
        files.forEach(file => {
          if (file.folders && file.folders.length > 0) {
            let currentPath = '';
            file.folders.forEach((folder: string) => {
              const parentPath = currentPath;
              currentPath = currentPath ? `${currentPath}/${folder}` : folder;
              if (!folders.has(currentPath)) {
                const folderNode = {
                  name: folder,
                  type: 'folder' as const,
                  path: `/${currentPath}`,
                  children: []
                };
                folders.set(currentPath, folderNode);

                if (parentPath && folders.has(parentPath)) {
                  folders.get(parentPath).children.push(folderNode);
                } else if (!parentPath) {
                  tree.push(folderNode);
                }
              }
            });
          }
        });

        // Then add files to appropriate folders or root
        files.forEach(file => {
          const fileNode = {
            name: file.name,
            type: 'file' as const,
            path: file.path,
            language: file.language,
            content: file.content
          };

          if (file.folders && file.folders.length > 0) {
            const folderPath = file.folders.join('/');
            if (folders.has(folderPath)) {
              folders.get(folderPath).children.push(fileNode);
            }
          } else {
            tree.push(fileNode);
          }
        });

        return tree;
      };

      const fileTree = buildFileTree(generatedFiles);

      // Update project with generated files
      setProject({
        name: projectStructure.projectName,
        files: fileTree,
        activeFile: fileTree[0] || null,
        projectType: projectStructure.projectType
      });

      // If WebContainer is available, write files to it
      if (webcontainerInstance) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Writing files to WebContainer...'
        }]);

        for (const file of generatedFiles) {
          await webcontainerInstance.fs.writeFile(file.path, file.content);
        }

        // Run npm install if package.json was created
        if (generatedFiles.some(f => f.path === '/package.json')) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Installing dependencies...'
          }]);

          const installProcess = await webcontainerInstance.spawn('npm', ['install']);

          installProcess.output.pipeTo(new WritableStream({
            write(data) {
              console.log('Install:', data);
            }
          }));

          const exitCode = await installProcess.exit;

          if (exitCode === 0) {
            // Start dev server if available
            if (projectStructure.scripts?.dev) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Starting development server...'
              }]);

              const devProcess = await webcontainerInstance.spawn('npm', ['run', 'dev']);

              devProcess.output.pipeTo(new WritableStream({
                write(data) {
                  console.log('Dev server:', data);
                }
              }));
            }
          }
        }
      } else if (onWebContainerNeeded) {
        // Notify parent that WebContainer is needed for full functionality
        onWebContainerNeeded();
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Project created successfully!\n\n**${projectStructure.projectName}**\n${projectStructure.description}\n\nGenerated ${generatedFiles.length} files with the proper ${projectStructure.projectType} structure.\n\n${webcontainerInstance ? 'WebContainer is running your dev server.' : 'Preview the files or start WebContainer to run the dev server.'}`
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`
      }]);
    } finally {
      setIsLoading(false);
      if (isFirstMessage) {
        setIsFirstMessage(false);
        if (onFirstMessage) onFirstMessage();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-robot mr-2 text-blue-400"></i>
          AI Assistant Pro
        </h2>
        <p className="text-xs text-gray-500 mt-1">Powered by Claude with full project generation</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm">{message.content}</pre>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-200 rounded-lg px-4 py-2">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Describe what you want to build..."
            className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>

        {!webcontainerInstance && (
          <div className="mt-2 text-xs text-yellow-500">
            <i className="fas fa-info-circle mr-1"></i>
            WebContainer not running. Start it for full dev server capabilities.
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistantEnhanced;