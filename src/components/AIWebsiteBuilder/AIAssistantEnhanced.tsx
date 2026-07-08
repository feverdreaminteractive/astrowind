import React, { useState, useRef, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  path: string;
  language?: string;
}

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

  const clearChatHistory = () => {
    // Clear messages from state
    setMessages([WELCOME_MESSAGE]);

    // Clear from localStorage
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
    localStorage.removeItem(DRAFT_STORAGE_KEY);

    // Reset project if needed
    if (project.files.length > 0) {
      setProject({
        name: 'my-project',
        files: [],
        activeFile: null
      });
    }

    // Clear input
    setInput('');

    console.log('Chat history and project cleared');
  };

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
          content: 'Analyzing the error and generating fixes...'
        }]);

        // Parse the error to understand what's needed
        let missingFiles: string[] = [];
        let errorType = 'general';

        // Check for import errors
        if (userMessage.includes('Could not import') || userMessage.includes('Does the file exist')) {
          errorType = 'missing_import';
          // Extract the missing file path
          const importMatch = userMessage.match(/Could not import ([^.\s]+\.[a-z]+)/);
          if (importMatch) {
            missingFiles.push(importMatch[1]);
          }
        }

        // First, ask AI to analyze and provide the fix
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            browserData: {
              isWebContainer: true,
              requestType: 'fix_error',
              errorType: errorType,
              missingFiles: missingFiles,
              currentProject: {
                name: project.name,
                files: project.files.map(f => f.path),
                projectType: project.projectType
              },
              systemPrompt: `You are fixing an error in an ${project.projectType || 'Astro'} project.

Error: ${userMessage}

${missingFiles.length > 0 ? `The following files are missing and need to be created: ${missingFiles.join(', ')}` : ''}

CRITICAL: You MUST respond with a JSON object containing the COMPLETE file content.
DO NOT provide suggestions or explanations in the content field.
Generate the FULL, WORKING file content.

{
  "files": [
    {
      "path": "/src/components/Navigation.astro",
      "content": "ACTUAL COMPLETE FILE CONTENT HERE - NOT A DESCRIPTION"
    }
  ],
  "explanation": "Brief explanation of what was fixed"
}

Example for a missing Navigation.astro:
{
  "files": [
    {
      "path": "/src/components/Navigation.astro",
      "content": "---\\n// Navigation component\\n---\\n<nav>\\n  <ul>\\n    <li><a href=\\"/\\">Home</a></li>\\n    <li><a href=\\"/about\\">About</a></li>\\n    <li><a href=\\"/contact\\">Contact</a></li>\\n  </ul>\\n</nav>\\n\\n<style>\\n  nav {\\n    padding: 1rem;\\n    background: #333;\\n  }\\n  ul {\\n    list-style: none;\\n    display: flex;\\n    gap: 1rem;\\n    margin: 0;\\n    padding: 0;\\n  }\\n  a {\\n    color: white;\\n    text-decoration: none;\\n  }\\n  a:hover {\\n    text-decoration: underline;\\n  }\\n</style>"
    }
  ],
  "explanation": "Created Navigation.astro component with basic navigation menu"
}`
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get response from AI');
        }

        const data = await response.json();
        const rawResponse = data.response || data.message || '';

        try {
          // Try to parse as JSON
          let fixData;

          // Extract JSON from the response
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            fixData = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: try to parse the whole response
            fixData = JSON.parse(rawResponse);
          }

          if (fixData.files && Array.isArray(fixData.files)) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: fixData.explanation || 'Applying fixes...'
            }]);

            // Create/update each file
            for (const file of fixData.files) {
              const fileName = file.path.split('/').pop() || 'unknown';
              const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;

              // Detect language
              const ext = fileName.split('.').pop() || '';
              const languageMap: { [key: string]: string } = {
                'astro': 'astro',
                'tsx': 'typescript',
                'ts': 'typescript',
                'jsx': 'javascript',
                'js': 'javascript',
                'css': 'css',
                'html': 'html',
                'json': 'json'
              };

              // Create the file node
              const newFile = {
                name: fileName,
                type: 'file' as const,
                path: file.path,
                content: file.content,
                language: languageMap[ext] || 'plaintext'
              };

              // Add to project structure
              const addFileToTree = (files: FileNode[], newFile: FileNode): FileNode[] => {
                // Check if file already exists and update it
                const existingIndex = files.findIndex(f => f.path === newFile.path);
                if (existingIndex >= 0) {
                  files[existingIndex] = newFile;
                  return files;
                }

                // Otherwise, add it to the correct folder
                const pathParts = cleanPath.split('/');
                if (pathParts.length > 1) {
                  const folderName = pathParts[0];
                  const folder = files.find(f => f.type === 'folder' && f.name === folderName);

                  if (folder && folder.children) {
                    // Remove the first part of the path and recurse
                    const subPath = pathParts.slice(1).join('/');
                    const subFile = { ...newFile, path: '/' + subPath };
                    folder.children = addFileToTree(folder.children, subFile);
                  } else if (!folder) {
                    // Create the folder structure if it doesn't exist
                    const newFolder: FileNode = {
                      name: folderName,
                      type: 'folder',
                      path: '/' + folderName,
                      children: []
                    };

                    // Add remaining path parts
                    let currentFolder = newFolder;
                    for (let i = 1; i < pathParts.length - 1; i++) {
                      const subFolder: FileNode = {
                        name: pathParts[i],
                        type: 'folder',
                        path: '/' + pathParts.slice(0, i + 1).join('/'),
                        children: []
                      };
                      currentFolder.children!.push(subFolder);
                      currentFolder = subFolder;
                    }

                    // Add the file to the deepest folder
                    currentFolder.children!.push({
                      ...newFile,
                      name: fileName
                    });

                    files.push(newFolder);
                  }
                } else {
                  // Root level file
                  files.push(newFile);
                }

                return files;
              };

              // Check if file exists
              const fileExists = project.files.some(f => f.path === newFile.path);

              // Update project files
              setProject(prev => ({
                ...prev,
                files: addFileToTree([...prev.files], newFile)
              }));

              // Write to WebContainer
              if (webcontainerInstance) {
                // Create directories if needed
                const dirPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));
                if (dirPath) {
                  try {
                    await webcontainerInstance.fs.mkdir(dirPath, { recursive: true });
                  } catch (error) {
                    console.error(`Failed to create directory ${dirPath}:`, error);
                  }
                }

                // Write the file
                try {
                  await webcontainerInstance.fs.writeFile(cleanPath, file.content);
                  console.log(`✅ ${fileExists ? 'Updated' : 'Created'} ${cleanPath}`);
                } catch (error) {
                  console.error(`Failed to write file ${cleanPath}:`, error);
                }
              }
            }

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Fixed! Created/updated ${fixData.files.length} file(s). The dev server should reload automatically.`
            }]);
          }
        } catch (e) {
          console.error('Failed to parse fix response:', e);
          console.log('Raw response:', rawResponse);

          // Try to extract file content from non-JSON response
          const codeBlockMatch = rawResponse.match(/```(\w+)?\n([\s\S]+?)```/);
          if (codeBlockMatch && missingFiles.length > 0) {
            // Found a code block, use it as the file content
            const fileContent = codeBlockMatch[2];
            const fileName = missingFiles[0];
            const filePath = fileName.startsWith('/') ? fileName : `/src/components/${fileName}`;

            const newFile = {
              name: fileName.split('/').pop() || 'unknown',
              type: 'file' as const,
              path: filePath,
              content: fileContent,
              language: fileName.endsWith('.astro') ? 'astro' : 'plaintext'
            };

            // Update project files
            setProject(prev => ({
              ...prev,
              files: [...prev.files, newFile]
            }));

            // Write to WebContainer
            if (webcontainerInstance) {
              const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
              const dirPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));

              if (dirPath) {
                try {
                  await webcontainerInstance.fs.mkdir(dirPath, { recursive: true });
                } catch (error) {
                  console.error(`Failed to create directory ${dirPath}:`, error);
                }
              }

              try {
                await webcontainerInstance.fs.writeFile(cleanPath, fileContent);
                console.log(`✅ Created ${cleanPath} from fallback`);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `✅ Created ${filePath}`
                }]);
              } catch (error) {
                console.error(`Failed to write file ${cleanPath}:`, error);
              }
            }
          } else {
            // Fallback to showing the raw response
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: rawResponse
            }]);
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
            systemPrompt: `You are a web development assistant.

IMPORTANT: Pay close attention to the user's EXACT request.
- Build EXACTLY what they ask for, not a generic template
- If they reference a specific template or GitHub repo, use that as the basis
- If they ask for something specific (portfolio, todo app, blog, dashboard, etc.), build that specific thing
- If they mention specific features, include those features

GITHUB REPOSITORIES:
- If the user provides a GitHub link, you MUST fetch and read the README
- Follow the setup instructions from the README exactly
- Use the same dependencies, scripts, and structure as specified in the repository
- Adapt the template/example to run properly in WebContainer environment
- Look for package.json in the repo to understand dependencies and scripts

User's request: "${userMessage}"

${userMessage.includes('github.com') ? `
CRITICAL: This request includes a GitHub repository. You must:
1. Analyze the repository structure
2. Read the README for setup instructions
3. Check package.json for dependencies and scripts
4. Adapt the project to work in WebContainer
5. Follow the exact setup steps from the documentation
` : ''}

Analyze this request carefully and return a JSON structure describing the project they want to build.

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

CRITICAL REQUIREMENTS:
1. ALWAYS include package.json with ALL necessary dependencies
2. SCAN YOUR CODE - Every import statement MUST have its package in dependencies
3. Common packages to include when imported:
   - commander: CLI argument parsing
   - express: Web server framework
   - fs-extra: File system operations
   - chalk: Terminal colors
   - dotenv: Environment variables
   - axios/fetch: HTTP requests
   - Any other package you import MUST be listed
4. Framework-specific requirements:
   - Astro MUST have /src/pages/index.astro or you get "No HTML file found"
   - React/Vite MUST have /index.html as entry point
   - Check that all entry points are created

For Astro projects specifically:
- /package.json (with astro dependency and ALL other required packages)
- /astro.config.mjs (Astro configuration)
- /tsconfig.json (TypeScript config)
- /src/pages/index.astro (homepage - REQUIRED for routing)
- /src/env.d.ts (TypeScript definitions)
- /public/favicon.svg (optional but recommended)

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
        const rawResponse = analysisData.content || analysisData.response || analysisData.message || '';

        // Extract JSON from the response (it might be wrapped in text)
        let jsonString = rawResponse;

        // Try to find JSON between markers or code blocks
        const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)```/) ||
                         rawResponse.match(/```\s*([\s\S]*?)```/) ||
                         rawResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          jsonString = jsonMatch[1] || jsonMatch[0];
        }

        // Clean up the JSON string
        jsonString = jsonString
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        projectStructure = JSON.parse(jsonString);

        console.log('Parsed project structure:', {
          name: projectStructure.projectName,
          type: projectStructure.projectType,
          commands: projectStructure.setupCommands,
          filesCount: projectStructure.files?.length
        });
      } catch (e) {
        console.error('Failed to parse project structure:', e);
        console.error('Raw response:', analysisData);
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
              systemPrompt: `Generate the COMPLETE content for ${fileSpec.path} in a ${projectStructure.projectType} project.

CONTEXT:
- Original user request: "${userMessage}"
- File purpose: ${fileSpec.description}
- Project type: ${projectStructure.projectType}

CRITICAL: Generate the ENTIRE FILE CONTENT, not a description or snippet.
- For .astro files: Include proper frontmatter (---) and complete HTML
- For .jsx/.tsx files: Include all imports and complete component code
- For .json files: Valid JSON with all required fields
- For config files: Complete configuration with all options

The file MUST be immediately runnable without modifications.
- Project: ${projectStructure.description}

${userMessage.includes('github.com') ? `
IMPORTANT: The user referenced a GitHub repository.
- Generate content that matches the repository's patterns and structure
- Follow the coding style and conventions from the repository
- Use the same libraries and approaches as the original
` : ''}

Generate content that fulfills the user's specific request, not generic boilerplate.
If they referenced a template, follow that template's patterns.

Return ONLY the raw file content, no markdown formatting or explanations.
For Astro files, use proper Astro syntax with --- frontmatter.
For React/Vue/Svelte, use proper component syntax.
Make sure the code is complete and functional.`
            }
          })
        });

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          let content = (fileData.response || fileData.message || '')
            .replace(/```[a-zA-Z]*\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

          const pathParts = fileSpec.path.split('/').filter(Boolean);
          const fileName = pathParts.pop() || 'unknown';

          // Ensure content is not empty
          if (!content || content.length === 0) {
            // Provide default content based on file type
            if (fileSpec.path.endsWith('.astro')) {
              const componentName = fileName.replace('.astro', '');
              if (fileSpec.path.includes('pages/index')) {
                content = `---
// Homepage
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>${projectStructure.projectName || 'My App'}</title>
  </head>
  <body>
    <h1>Welcome to ${projectStructure.projectName || 'My App'}</h1>
    <p>Start editing src/pages/index.astro to see changes!</p>
  </body>
</html>`;
              } else if (fileSpec.path.includes('Layout')) {
                content = `---
export interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>`;
              } else {
                content = `---
// ${fileSpec.description || componentName}
---
<div>
  <h2>${componentName}</h2>
  <p>${fileSpec.description || 'Component content'}</p>
</div>`;
              }
            } else if (fileSpec.path.endsWith('astro.config.mjs')) {
              content = `import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({});`;
            } else if (fileSpec.path.endsWith('tsconfig.json')) {
              content = `{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["astro/client"]
  }
}`;
            } else if (fileSpec.path.endsWith('env.d.ts')) {
              content = `/// <reference types="astro/client" />`;
            } else if (fileSpec.path.endsWith('.css')) {
              content = `/* ${fileSpec.description || 'Styles'} */\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}`;
            } else if (fileSpec.path.endsWith('.js') || fileSpec.path.endsWith('.mjs')) {
              content = `// ${fileSpec.description || 'JavaScript file'}\n\nexport default {}`;
            } else if (fileSpec.path.endsWith('.json')) {
              content = '{}';
            } else {
              content = `<!-- ${fileSpec.description || 'File content'} -->`;
            }
            console.warn(`Generated default content for empty file: ${fileSpec.path}`);
          }

          // Validate Astro files have proper structure
          if (fileSpec.path.endsWith('.astro') && !content.includes('---')) {
            // Add minimal frontmatter if missing
            content = `---\n// Component\n---\n${content}`;
          }
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

      // Check if project has package.json
      const hasPackageJson = generatedFiles.some(f => f.path === '/package.json');

      // Start WebContainer if needed and project has package.json
      if (!webcontainerInstance && hasPackageJson && onWebContainerNeeded) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Starting WebContainer for your project...'
        }]);
        onWebContainerNeeded();
      }

      // Update project with generated files and setup commands
      setProject({
        name: projectStructure.projectName,
        files: fileTree,
        activeFile: fileTree[0] || null,
        projectType: projectStructure.projectType,
        setupCommands: projectStructure.setupCommands || ['npm install', 'npm run dev'],
        devServerPort: projectStructure.devServerPort || 3000,
        devServerUrl: projectStructure.devServerUrl || 'http://localhost:3000'
      });

      // Note: Files will be written to WebContainer via handleProjectUpdate in AIBuilderPro
      // If WebContainer is available, write files to it (this is for when WebContainer is already running)
      if (webcontainerInstance) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Writing files to WebContainer...'
        }]);

        // Create directories first
        const directories = new Set<string>();
        for (const file of generatedFiles) {
          if (file.folders && file.folders.length > 0) {
            let currentPath = '';
            for (const folder of file.folders) {
              currentPath = currentPath ? `${currentPath}/${folder}` : folder;
              directories.add(currentPath);
            }
          }
        }

        // Create all directories
        for (const dir of directories) {
          try {
            await webcontainerInstance.fs.mkdir(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
          } catch (error) {
            console.error(`Failed to create directory ${dir}:`, error);
          }
        }

        // Write files with proper path handling
        for (const file of generatedFiles) {
          // Remove leading slash from path for WebContainer
          const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;

          try {
            await webcontainerInstance.fs.writeFile(cleanPath, file.content);
            console.log(`Wrote file: ${cleanPath}`);
          } catch (error) {
            console.error(`Failed to write file ${cleanPath}:`, error);
          }
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
        // Auto-start WebContainer for projects with package.json
        const hasPackageJson = generatedFiles.some(f =>
          f.path === '/package.json' || f.name === 'package.json'
        );

        if (hasPackageJson) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🚀 Starting WebContainer to run your project...'
          }]);
          onWebContainerNeeded();
        }
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center">
              <i className="fas fa-robot mr-2 text-blue-400"></i>
              AI Assistant Pro
            </h2>
            <p className="text-xs text-gray-500 mt-1">Powered by Claude with full project generation</p>
          </div>
          <button
            onClick={clearChatHistory}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
            title="Clear chat history"
          >
            <i className="fas fa-trash text-sm"></i>
          </button>
        </div>
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