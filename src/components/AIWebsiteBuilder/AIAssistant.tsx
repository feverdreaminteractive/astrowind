import React, { useState, useRef, useEffect } from 'react';

interface Props {
  project: any;
  setProject: (project: any) => void;
  selectedFile: any;
  onFirstMessage?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC<Props> = ({ project, setProject, selectedFile, onFirstMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Ready to build.\n\nDescribe your project and I'll generate the code.\n\nExamples:\n• Modern portfolio with dark theme\n• SaaS landing page with pricing cards\n• E-commerce product showcase\n• Documentation site with sidebar nav\n• Dashboard with data visualizations\n\nWhat are we building?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Try to use real AI first
    const USE_REAL_AI = true; // Set to false to use mock responses

    if (USE_REAL_AI) {
      try {
        // Prepare the API URL
        const apiUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:9999/.netlify/functions/claude'
          : '/.netlify/functions/claude';

        // Build context about current project
        let context = '';
        if (project.files.length > 0) {
          context = 'Current project files:\n';
          project.files.forEach((file: any) => {
            context += `\nFile: ${file.name}\n${file.content?.substring(0, 300)}...\n`;
          });
        }

        // Create the prompt for Claude
        const systemPrompt = `You are an AI website builder. Generate complete HTML, CSS, and JavaScript files based on the user's request.

${context || 'Create a new website from scratch.'}

User request: "${userMessage}"

Important:
- Use Flowbite CSS framework (include CDN)
- Make it responsive and modern
- For "dark theme" requests, modify CSS colors
- For "add products/cards" requests, add HTML sections
- Always return a valid JSON object with this structure:
{
  "message": "Brief description of what you did",
  "files": [
    {
      "name": "index.html",
      "type": "file",
      "path": "/index.html",
      "content": "complete HTML content here"
    },
    {
      "name": "styles.css",
      "type": "file",
      "path": "/styles.css",
      "content": "complete CSS content here"
    },
    {
      "name": "script.js",
      "type": "file",
      "path": "/script.js",
      "content": "complete JS content here"
    }
  ]
}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage, // Send just the user message, not the whole prompt
            browserData: { isWebBuilder: true }
          })
        });

        if (response.ok) {
          const data = await response.json();

          try {
            // Try to parse the AI response as JSON
            let aiResponse;

            // Get the response text from either message or response field
            const responseText = data.message || data.response || '';

            // Remove ```json wrapper if present
            const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            // Look for JSON between markers
            const jsonStart = cleanedResponse.indexOf('<<<JSON_START>>>');
            const jsonEnd = cleanedResponse.indexOf('<<<JSON_END>>>');

            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = cleanedResponse.substring(jsonStart + 16, jsonEnd);
              aiResponse = JSON.parse(jsonStr);
            } else {
              // Try to extract JSON from the response
              const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiResponse = JSON.parse(jsonMatch[0]);
              } else {
                throw new Error('No JSON found in response');
              }
            }

            if (aiResponse.files && Array.isArray(aiResponse.files)) {
              // Update project with AI-generated files
              const updatedFiles = aiResponse.files.map((f: any) => ({
                ...f,
                language: f.name.endsWith('.html') ? 'html' :
                          f.name.endsWith('.css') ? 'css' :
                          f.name.endsWith('.js') ? 'javascript' : 'plaintext'
              }));

              console.log('Generated files:', updatedFiles);

              setProject({
                ...project,
                name: project.name || 'ai-website',
                files: updatedFiles
              });

              // Add AI response message
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: aiResponse.message || "I've generated your website based on your request."
              }]);

              setIsLoading(false);
              if (isFirstMessage) {
                setIsFirstMessage(false);
                if (onFirstMessage) onFirstMessage();
              }
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            // Fall through to mock response
          }
        }
      } catch (error) {
        console.error('AI API error:', error);
        // Fall through to mock response
      }
    }

    // If AI fails or is disabled, continue with mock response
    // If this is the first message and no files exist, create starter files
    if (isFirstMessage && project.files.length === 0) {
      setIsFirstMessage(false);
      if (onFirstMessage) onFirstMessage();

      // Create initial files based on user's request
      const starterFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
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
    <p>Building based on: ${userMessage}</p>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

h1 {
    margin-bottom: 1rem;
}`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// JavaScript code will go here
console.log('Website initialized');`
        }
      ];

      setProject({ ...project, files: starterFiles });
    }

    // Generate appropriate response based on the message
    let responseMessage = '';
    let generatedFiles: any[] = [];

    // Check for different website types and generate appropriate content
    let projectName = 'my-website';

    if (userMessage.toLowerCase().includes('portfolio')) {
      responseMessage = "I'll create a portfolio website for you using Flowbite components with a clean layout and projects section.";
      projectName = 'portfolio-site';

      generatedFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio | Web Developer</title>
    <!-- Flowbite CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="bg-white border-gray-200 border-b">
        <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
            <a href="#" class="flex items-center space-x-3">
                <span class="self-center text-2xl font-semibold whitespace-nowrap">Portfolio</span>
            </a>
            <button data-collapse-toggle="navbar-default" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
                <span class="sr-only">Open main menu</span>
                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
                </svg>
            </button>
            <div class="hidden w-full md:block md:w-auto" id="navbar-default">
                <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white">
                    <li><a href="#home" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0">Home</a></li>
                    <li><a href="#about" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0">About</a></li>
                    <li><a href="#projects" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0">Projects</a></li>
                    <li><a href="#contact" class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0">Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="bg-white">
        <div class="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
            <h1 class="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                Portfolio Website
            </h1>
            <p class="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48">
                Welcome to my portfolio. Browse my projects below.
            </p>
            <div class="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
                <a href="#projects" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300">
                    View Projects
                    <svg class="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                    </svg>
                </a>
                <a href="#contact" class="inline-flex justify-center items-center py-3 px-5 sm:ms-4 text-base font-medium text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100">
                    Contact
                </a>
            </div>
        </div>
    </section>

    <!-- Projects Section -->
    <section id="projects" class="bg-gray-50 py-16">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center text-gray-900 mb-12 px-4">Projects</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center sm:justify-items-stretch">
                <!-- Project Card 1 -->
                <div class="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow">
                    <img class="rounded-t-lg" src="https://picsum.photos/400/200?random=1" alt="Project 1" />
                    <div class="p-5">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">Project One</h5>
                        <p class="mb-3 font-normal text-gray-700">Description of the first project goes here.</p>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">HTML</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">CSS</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">JavaScript</span>
                        </div>
                        <a href="#" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-900">
                            View Project
                            <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>
                </div>
                <!-- Project Card 2 -->
                <div class="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow">
                    <img class="rounded-t-lg" src="https://picsum.photos/400/200?random=2" alt="Project 2" />
                    <div class="p-5">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">Project Two</h5>
                        <p class="mb-3 font-normal text-gray-700">Description of the second project goes here.</p>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">React</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Node.js</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">MongoDB</span>
                        </div>
                        <a href="#" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-900">
                            View Project
                            <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>
                </div>
                <!-- Project Card 3 -->
                <div class="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow">
                    <img class="rounded-t-lg" src="https://picsum.photos/400/200?random=3" alt="Project 3" />
                    <div class="p-5">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">Project Three</h5>
                        <p class="mb-3 font-normal text-gray-700">Description of the third project goes here.</p>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Python</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">Django</span>
                            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">PostgreSQL</span>
                        </div>
                        <a href="#" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-900">
                            View Project
                            <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-screen-xl mx-auto px-4">
            <div class="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">Portfolio</h3>
                    <p class="text-gray-400">Building amazing web experiences with modern technologies.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Quick Links</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#home" class="hover:text-white">Home</a></li>
                        <li><a href="#about" class="hover:text-white">About</a></li>
                        <li><a href="#projects" class="hover:text-white">Projects</a></li>
                        <li><a href="#contact" class="hover:text-white">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Connect</h4>
                    <div class="flex gap-4 mb-4">
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.02-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.94.12.78.88z"/></svg>
                        </a>
                    </div>
                    <p class="text-gray-400">Let's work together!</p>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>&copy; 2024 Portfolio. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <!-- Flowbite JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `/* Custom styles */

/* Smooth scrolling */
html {
    scroll-behavior: smooth;
}

/* Basic layout adjustments */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Navigation background ensure */
nav {
    background-color: #ffffff !important;
}

/* Heading spacing */
h1, h2, h3, h4, h5, h6 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
    .max-w-sm {
        max-width: 100%;
        margin-left: auto;
        margin-right: auto;
    }
}`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// Basic JavaScript functionality

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

console.log('Website loaded');`
        }
      ];
    } else if (userMessage.toLowerCase().includes('e-commerce') || userMessage.toLowerCase().includes('store') || userMessage.toLowerCase().includes('shop')) {
      responseMessage = "I'll create an e-commerce site with Stripe integration, product cards, and a shopping cart.";
      projectName = 'ecommerce-store';

      generatedFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shop - Modern E-commerce Store</title>
    <!-- Stripe -->
    <script src="https://js.stripe.com/v3/"></script>
    <!-- Flowbite CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation with Cart -->
    <nav class="bg-white border-b sticky top-0 z-50">
        <div class="max-w-screen-xl mx-auto px-4 py-3">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">SHOP</h1>
                <div class="flex items-center gap-4">
                    <button id="cart-btn" class="relative">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <span id="cart-count" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Banner -->
    <section class="bg-gray-50 py-12">
        <div class="max-w-screen-xl mx-auto px-4 text-center">
            <h2 class="text-4xl font-bold mb-4">Summer Collection 2024</h2>
            <p class="text-gray-600 mb-6">Discover our latest products</p>
            <button class="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition">Shop Now</button>
        </div>
    </section>

    <!-- Product Grid -->
    <section class="py-12">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-2xl font-bold mb-8 px-2">Our Products</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center sm:justify-items-stretch" id="products-grid">
                <!-- Products will be dynamically loaded here -->
            </div>
        </div>
    </section>

    <!-- Shopping Cart Modal -->
    <div id="cart-modal" class="fixed inset-0 bg-black/50 hidden z-50">
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="text-xl font-bold">Shopping Cart</h3>
                <button onclick="toggleCart()" class="text-gray-500 hover:text-black">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div id="cart-items" class="p-4 flex-1 overflow-y-auto">
                <!-- Cart items -->
            </div>
            <div class="p-4 border-t">
                <div class="flex justify-between mb-4">
                    <span class="font-bold">Total:</span>
                    <span id="cart-total" class="font-bold">$0.00</span>
                </div>
                <button id="checkout-btn" class="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition">
                    Checkout with Stripe
                </button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-screen-xl mx-auto px-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">SHOP</h3>
                    <p class="text-gray-400">Your one-stop shop for quality products and great deals.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Shop</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">New Arrivals</a></li>
                        <li><a href="#" class="hover:text-white">Best Sellers</a></li>
                        <li><a href="#" class="hover:text-white">Sale</a></li>
                        <li><a href="#" class="hover:text-white">All Products</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Customer Service</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Contact Us</a></li>
                        <li><a href="#" class="hover:text-white">Shipping Info</a></li>
                        <li><a href="#" class="hover:text-white">Returns</a></li>
                        <li><a href="#" class="hover:text-white">FAQ</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Connect</h4>
                    <div class="flex gap-4 mb-4">
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>
                        </a>
                    </div>
                    <p class="text-gray-400">Subscribe to our newsletter</p>
                    <form class="mt-3 flex">
                        <input type="email" placeholder="Your email" class="px-3 py-2 bg-gray-800 text-white rounded-l flex-1">
                        <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r">Subscribe</button>
                    </form>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>&copy; 2024 SHOP. All rights reserved. | <a href="#" class="hover:text-white">Privacy Policy</a> | <a href="#" class="hover:text-white">Terms of Service</a></p>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `/* E-commerce styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #111;
}

/* Navigation background ensure */
nav {
    background-color: #ffffff !important;
}

/* Heading spacing */
h1, h2, h3, h4, h5, h6 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.product-card {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
    width: 100%;
    max-width: 300px;
}

@media (min-width: 640px) {
    .product-card {
        max-width: 100%;
    }
}

.product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.product-image {
    width: 100%;
    height: 300px;
    object-fit: cover;
    background: #f5f5f5;
}

.product-info {
    padding: 16px;
}

.product-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
}

.product-price {
    font-size: 18px;
    font-weight: bold;
    color: #111;
}

.add-to-cart {
    width: 100%;
    padding: 10px;
    background: #111;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.add-to-cart:hover {
    background: #333;
}

.cart-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #e5e5e5;
}

.cart-item img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
}`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// E-commerce functionality with Stripe integration

// Sample products data
const products = [
    { id: 1, name: 'Classic T-Shirt', price: 29.99, image: 'https://picsum.photos/400/500?random=1', category: 'clothing' },
    { id: 2, name: 'Denim Jeans', price: 79.99, image: 'https://picsum.photos/400/500?random=2', category: 'clothing' },
    { id: 3, name: 'Sneakers', price: 119.99, image: 'https://picsum.photos/400/500?random=3', category: 'shoes' },
    { id: 4, name: 'Backpack', price: 49.99, image: 'https://picsum.photos/400/500?random=4', category: 'accessories' },
    { id: 5, name: 'Watch', price: 199.99, image: 'https://picsum.photos/400/500?random=5', category: 'accessories' },
    { id: 6, name: 'Sunglasses', price: 89.99, image: 'https://picsum.photos/400/500?random=6', category: 'accessories' },
    { id: 7, name: 'Hoodie', price: 59.99, image: 'https://picsum.photos/400/500?random=7', category: 'clothing' },
    { id: 8, name: 'Running Shoes', price: 139.99, image: 'https://picsum.photos/400/500?random=8', category: 'shoes' }
];

// Shopping cart
let cart = [];

// Initialize Stripe (replace with your public key)
const stripe = Stripe('pk_test_YOUR_STRIPE_PUBLIC_KEY');

// Load products
function loadProducts() {
    const grid = document.getElementById('products-grid');

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = \\\`
            <img src="\\\${product.image}" alt="\\\${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">\\\${product.name}</h3>
                <p class="product-price">$\\\${product.price.toFixed(2)}</p>
                <button class="add-to-cart mt-3" onclick="addToCart(\\\${product.id})">
                    Add to Cart
                </button>
            </div>
        \\\`;
        grid.appendChild(productCard);
    });
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    showNotification('Product added to cart!');
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update items list
    cartItems.innerHTML = '';
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = \\\`
            <img src="\\\${item.image}" alt="\\\${item.name}">
            <div class="flex-1">
                <h4 class="font-medium">\\\${item.name}</h4>
                <p class="text-gray-600">$\\\${item.price.toFixed(2)} x \\\${item.quantity}</p>
            </div>
            <button onclick="removeFromCart(\\\${item.id})" class="text-red-500 hover:text-red-700">
                Remove
            </button>
        \\\`;
        cartItems.appendChild(cartItem);
    });

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = \\\`$\\\${total.toFixed(2)}\\\`;
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

// Toggle cart modal
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.classList.toggle('hidden');
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Checkout with Stripe
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // In a real app, you'd create a checkout session on your backend
    alert('Stripe checkout would open here. Configure your Stripe public key to enable payments.');

    // Example Stripe integration:
    // const response = await fetch('/create-checkout-session', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ items: cart })
    // });
    // const session = await response.json();
    // await stripe.redirectToCheckout({ sessionId: session.id });
});

// Cart button click
document.getElementById('cart-btn').addEventListener('click', toggleCart);

// Initialize
loadProducts();
console.log('E-commerce site loaded');`
        }
      ];
    } else if (userMessage.toLowerCase().includes('blog')) {
      responseMessage = "I'll create a blog website with articles, categories, and a clean reading experience.";
      projectName = 'blog-site';

      generatedFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog - Thoughts & Ideas</title>
    <!-- Flowbite CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="bg-white border-b">
        <div class="max-w-screen-xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">My Blog</h1>
                <div class="flex gap-6">
                    <a href="#" class="hover:text-gray-600">Home</a>
                    <a href="#categories" class="hover:text-gray-600">Categories</a>
                    <a href="#about" class="hover:text-gray-600">About</a>
                    <a href="#contact" class="hover:text-gray-600">Contact</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="bg-gray-50 py-16">
        <div class="max-w-screen-xl mx-auto px-4 text-center">
            <h2 class="text-5xl font-bold mb-4">Welcome to My Blog</h2>
            <p class="text-xl text-gray-600 mb-8">Exploring ideas, sharing stories, and learning together</p>
            <div class="flex justify-center gap-4">
                <button class="px-6 py-2 bg-black text-white rounded hover:bg-gray-800">Latest Posts</button>
                <button class="px-6 py-2 border border-black rounded hover:bg-gray-50">Subscribe</button>
            </div>
        </div>
    </header>

    <!-- Featured Post -->
    <section class="py-12 bg-white">
        <div class="max-w-screen-xl mx-auto px-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <img src="https://picsum.photos/600/400?random=1" alt="Featured" class="rounded-lg shadow-lg">
                <div>
                    <span class="text-sm text-gray-500">FEATURED • 5 MIN READ</span>
                    <h3 class="text-3xl font-bold mt-2 mb-4">The Art of Simple Living</h3>
                    <p class="text-gray-600 mb-4">Discover how simplifying your life can lead to greater happiness and productivity. Learn practical tips for decluttering both your physical and digital spaces.</p>
                    <a href="#" class="text-black font-medium hover:underline">Read More →</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Recent Posts Grid -->
    <section class="py-12 bg-gray-50">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold mb-8 px-2">Recent Posts</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center sm:justify-items-stretch" id="posts-grid">
                <!-- Blog posts will be loaded here -->
            </div>
            <div class="text-center mt-12">
                <button class="px-6 py-3 border border-black rounded hover:bg-white">Load More Posts</button>
            </div>
        </div>
    </section>

    <!-- Categories -->
    <section id="categories" class="py-12 bg-white">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold mb-8 px-2">Browse by Category</h2>
            <div class="flex flex-wrap gap-4" id="categories-list">
                <!-- Categories will be loaded here -->
            </div>
        </div>
    </section>

    <!-- Newsletter -->
    <section class="py-16 bg-gray-900 text-white">
        <div class="max-w-screen-xl mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-4">Stay Updated</h2>
            <p class="mb-8">Get the latest posts delivered straight to your inbox</p>
            <form class="max-w-md mx-auto flex gap-4">
                <input type="email" placeholder="Your email" class="flex-1 px-4 py-2 rounded text-black">
                <button type="submit" class="px-6 py-2 bg-white text-black rounded hover:bg-gray-200">Subscribe</button>
            </form>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-screen-xl mx-auto px-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">My Blog</h3>
                    <p class="text-gray-400">Exploring ideas, sharing stories, and learning together.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Categories</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Technology</a></li>
                        <li><a href="#" class="hover:text-white">Programming</a></li>
                        <li><a href="#" class="hover:text-white">Productivity</a></li>
                        <li><a href="#" class="hover:text-white">Lifestyle</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Pages</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">About</a></li>
                        <li><a href="#" class="hover:text-white">Contact</a></li>
                        <li><a href="#" class="hover:text-white">Archive</a></li>
                        <li><a href="#" class="hover:text-white">RSS Feed</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Follow</h4>
                    <div class="flex gap-4 mb-4">
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                        </a>
                    </div>
                    <p class="text-gray-400">Get the latest posts delivered to your inbox</p>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>&copy; 2024 My Blog. All rights reserved. | <a href="#" class="hover:text-white">Privacy Policy</a> | <a href="#" class="hover:text-white">Terms of Service</a></p>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `/* Blog styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #111;
}

/* Navigation background ensure */
nav {
    background-color: #ffffff !important;
}

/* Heading spacing */
h1, h2, h3, h4, h5, h6 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.blog-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    width: 100%;
    max-width: 400px;
}

@media (min-width: 640px) {
    .blog-card {
        max-width: 100%;
    }
}

.blog-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.blog-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.blog-content {
    padding: 20px;
}

.blog-meta {
    color: #666;
    font-size: 14px;
    margin-bottom: 8px;
}

.blog-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 12px;
    line-height: 1.3;
}

.blog-excerpt {
    color: #666;
    line-height: 1.5;
    margin-bottom: 16px;
}

.category-tag {
    display: inline-block;
    padding: 6px 16px;
    background: #f5f5f5;
    border-radius: 20px;
    font-size: 14px;
    transition: all 0.2s;
    cursor: pointer;
}

.category-tag:hover {
    background: #111;
    color: white;
}

.category-tag.active {
    background: #111;
    color: white;
}`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// Blog functionality

// Sample blog posts data
const posts = [
    {
        id: 1,
        title: 'Getting Started with Web Development',
        excerpt: 'A comprehensive guide for beginners looking to start their journey in web development.',
        category: 'Technology',
        author: 'John Doe',
        date: '2024-01-15',
        readTime: '5 min',
        image: 'https://picsum.photos/400/300?random=1'
    },
    {
        id: 2,
        title: 'The Future of Artificial Intelligence',
        excerpt: 'Exploring how AI is transforming industries and what it means for our future.',
        category: 'Technology',
        author: 'Jane Smith',
        date: '2024-01-14',
        readTime: '7 min',
        image: 'https://picsum.photos/400/300?random=2'
    },
    {
        id: 3,
        title: 'Mastering Remote Work',
        excerpt: 'Tips and strategies for staying productive and maintaining work-life balance.',
        category: 'Productivity',
        author: 'Mike Johnson',
        date: '2024-01-13',
        readTime: '4 min',
        image: 'https://picsum.photos/400/300?random=3'
    },
    {
        id: 4,
        title: 'Healthy Habits for Developers',
        excerpt: 'Simple practices to maintain physical and mental health while coding.',
        category: 'Lifestyle',
        author: 'Sarah Lee',
        date: '2024-01-12',
        readTime: '6 min',
        image: 'https://picsum.photos/400/300?random=4'
    },
    {
        id: 5,
        title: 'Understanding Cloud Computing',
        excerpt: 'A deep dive into cloud services and how they are revolutionizing IT infrastructure.',
        category: 'Technology',
        author: 'David Chen',
        date: '2024-01-11',
        readTime: '8 min',
        image: 'https://picsum.photos/400/300?random=5'
    },
    {
        id: 6,
        title: 'The Art of Code Review',
        excerpt: 'Best practices for giving and receiving constructive feedback on code.',
        category: 'Programming',
        author: 'Emily Wilson',
        date: '2024-01-10',
        readTime: '5 min',
        image: 'https://picsum.photos/400/300?random=6'
    }
];

// Categories
const categories = ['All', 'Technology', 'Programming', 'Productivity', 'Lifestyle', 'Design'];

// Current filter
let currentCategory = 'All';

// Load blog posts
function loadPosts(category = 'All') {
    const grid = document.getElementById('posts-grid');
    grid.innerHTML = '';

    const filteredPosts = category === 'All'
        ? posts
        : posts.filter(post => post.category === category);

    filteredPosts.forEach(post => {
        const postCard = document.createElement('article');
        postCard.className = 'blog-card';
        postCard.innerHTML = \\\`
            <img src="\\\${post.image}" alt="\\\${post.title}" class="blog-image">
            <div class="blog-content">
                <div class="blog-meta">
                    \\\${post.category} • \\\${post.readTime} • \\\${formatDate(post.date)}
                </div>
                <h3 class="blog-title">\\\${post.title}</h3>
                <p class="blog-excerpt">\\\${post.excerpt}</p>
                <a href="#post-\\\${post.id}" class="text-black font-medium hover:underline">
                    Read More →
                </a>
            </div>
        \\\`;
        grid.appendChild(postCard);
    });
}

// Load categories
function loadCategories() {
    const container = document.getElementById('categories-list');

    categories.forEach(category => {
        const tag = document.createElement('button');
        tag.className = \\\`category-tag \\\${category === currentCategory ? 'active' : ''}\\\`;
        tag.textContent = category;
        tag.onclick = () => filterByCategory(category);
        container.appendChild(tag);
    });
}

// Filter by category
function filterByCategory(category) {
    currentCategory = category;
    loadPosts(category);

    // Update active category
    document.querySelectorAll('.category-tag').forEach(tag => {
        tag.classList.toggle('active', tag.textContent === category);
    });
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Newsletter form
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    if (email) {
        alert(\\\`Thanks for subscribing with \\\${email}!\\\`);
        e.target.reset();
    }
});

// Load more posts
document.querySelector('.text-center button').addEventListener('click', () => {
    // In a real app, this would load more posts from an API
    alert('This would load more posts from the server');
});

// Initialize
loadPosts();
loadCategories();
console.log('Blog loaded');`
        }
      ];
    } else if (userMessage.toLowerCase().includes('landing page') || userMessage.toLowerCase().includes('startup')) {
      responseMessage = "I'll create a modern landing page with hero section, features, pricing, and testimonials.";
      projectName = 'landing-page';

      generatedFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StartupName - Innovation Starts Here</title>
    <!-- Flowbite CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="fixed w-full top-0 bg-white/95 backdrop-blur-sm border-b z-50">
        <div class="max-w-screen-xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">StartupName</h1>
                <div class="hidden md:flex gap-6">
                    <a href="#features" class="hover:text-blue-600">Features</a>
                    <a href="#pricing" class="hover:text-blue-600">Pricing</a>
                    <a href="#testimonials" class="hover:text-blue-600">Testimonials</a>
                    <a href="#contact" class="hover:text-blue-600">Contact</a>
                </div>
                <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Get Started</button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-24 pb-12 bg-gradient-to-b from-blue-50 to-white">
        <div class="max-w-screen-xl mx-auto px-4 text-center py-16">
            <h2 class="text-5xl md:text-6xl font-bold mb-6">
                Build Something <span class="text-blue-600">Amazing</span>
            </h2>
            <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                The all-in-one platform to launch, grow, and scale your business with powerful tools and insights.
            </p>
            <div class="flex gap-4 justify-center">
                <button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Start Free Trial</button>
                <button class="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50">Watch Demo</button>
            </div>
            <p class="mt-4 text-sm text-gray-500">No credit card required • 14-day free trial</p>
        </div>
    </section>

    <!-- Features -->
    <section id="features" class="py-16 bg-white">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">Powerful Features</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Lightning Fast</h3>
                    <p class="text-gray-600">Optimized performance that scales with your needs</p>
                </div>
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Secure by Default</h3>
                    <p class="text-gray-600">Enterprise-grade security for your data</p>
                </div>
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Analytics & Insights</h3>
                    <p class="text-gray-600">Make data-driven decisions with powerful analytics</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-16 bg-gray-50">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <!-- Starter -->
                <div class="bg-white p-8 rounded-lg border">
                    <h3 class="text-xl font-bold mb-4">Starter</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold">$9</span>
                        <span class="text-gray-600">/month</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Up to 10 projects</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Basic analytics</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Email support</span>
                        </li>
                    </ul>
                    <button class="w-full py-2 border border-gray-300 rounded hover:bg-gray-50">Choose Plan</button>
                </div>
                <!-- Pro -->
                <div class="bg-blue-600 text-white p-8 rounded-lg relative">
                    <div class="absolute top-0 right-0 bg-yellow-400 text-black text-xs px-2 py-1 rounded-bl">POPULAR</div>
                    <h3 class="text-xl font-bold mb-4">Professional</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold">$29</span>
                        <span class="text-blue-100">/month</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Unlimited projects</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Advanced analytics</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Priority support</span>
                        </li>
                    </ul>
                    <button class="w-full py-2 bg-white text-blue-600 rounded hover:bg-gray-100">Choose Plan</button>
                </div>
                <!-- Enterprise -->
                <div class="bg-white p-8 rounded-lg border">
                    <h3 class="text-xl font-bold mb-4">Enterprise</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold">Custom</span>
                    </div>
                    <ul class="space-y-3 mb-8">
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Custom limits</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Dedicated support</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span>SLA guarantee</span>
                        </li>
                    </ul>
                    <button class="w-full py-2 border border-gray-300 rounded hover:bg-gray-50">Contact Sales</button>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="py-16 bg-white">
        <div class="max-w-screen-xl mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center md:justify-items-stretch">
                <div class="bg-gray-50 p-6 rounded-lg w-full max-w-sm mx-auto sm:max-w-none">
                    <div class="flex mb-4">
                        <span class="text-yellow-400">★★★★★</span>
                    </div>
                    <p class="text-gray-600 mb-4">"This platform transformed how we work. The features are exactly what we needed."</p>
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                        <div>
                            <p class="font-bold">Sarah Johnson</p>
                            <p class="text-sm text-gray-500">CEO, TechCorp</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 p-6 rounded-lg w-full max-w-sm mx-auto sm:max-w-none">
                    <div class="flex mb-4">
                        <span class="text-yellow-400">★★★★★</span>
                    </div>
                    <p class="text-gray-600 mb-4">"Outstanding support and incredible value. Couldn't be happier with our choice."</p>
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                        <div>
                            <p class="font-bold">Mike Chen</p>
                            <p class="text-sm text-gray-500">CTO, StartupXYZ</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 p-6 rounded-lg w-full max-w-sm mx-auto sm:max-w-none">
                    <div class="flex mb-4">
                        <span class="text-yellow-400">★★★★★</span>
                    </div>
                    <p class="text-gray-600 mb-4">"The analytics alone are worth it. We've increased efficiency by 40%."</p>
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                        <div>
                            <p class="font-bold">Emily Davis</p>
                            <p class="text-sm text-gray-500">Product Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section class="py-16 bg-blue-600 text-white">
        <div class="max-w-screen-xl mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p class="text-xl mb-8">Join thousands of businesses already using our platform</p>
            <button class="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 font-bold">Start Your Free Trial</button>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-screen-xl mx-auto px-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">StartupName</h3>
                    <p class="text-gray-400">Innovation starts here. Join thousands of businesses already using our platform.</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Product</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Features</a></li>
                        <li><a href="#" class="hover:text-white">Pricing</a></li>
                        <li><a href="#" class="hover:text-white">API</a></li>
                        <li><a href="#" class="hover:text-white">Integrations</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Company</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">About</a></li>
                        <li><a href="#" class="hover:text-white">Blog</a></li>
                        <li><a href="#" class="hover:text-white">Careers</a></li>
                        <li><a href="#" class="hover:text-white">Press</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">Support</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li><a href="#" class="hover:text-white">Help Center</a></li>
                        <li><a href="#" class="hover:text-white">Documentation</a></li>
                        <li><a href="#" class="hover:text-white">Contact Us</a></li>
                        <li><a href="#" class="hover:text-white">Status</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8">
                <div class="flex flex-col md:flex-row justify-between items-center">
                    <div class="text-gray-400 mb-4 md:mb-0">
                        <p>&copy; 2024 StartupName. All rights reserved.</p>
                    </div>
                    <div class="flex gap-6 text-gray-400">
                        <a href="#" class="hover:text-white">Privacy Policy</a>
                        <a href="#" class="hover:text-white">Terms of Service</a>
                        <a href="#" class="hover:text-white">Cookie Policy</a>
                    </div>
                    <div class="flex gap-4 mt-4 md:mt-0">
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `/* Landing page styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #111;
}

/* Navigation background ensure */
nav {
    background-color: #ffffff !important;
    border-bottom: 1px solid #e5e7eb;
}

/* Heading spacing */
h1, h2, h3, h4, h5, h6 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
}`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// Landing page functionality

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle CTA buttons
document.querySelectorAll('button').forEach(button => {
    if (button.textContent.includes('Get Started') ||
        button.textContent.includes('Start Free Trial') ||
        button.textContent.includes('Start Your Free Trial')) {
        button.addEventListener('click', () => {
            alert('Signup form would open here. Configure your signup flow.');
        });
    }

    if (button.textContent.includes('Watch Demo')) {
        button.addEventListener('click', () => {
            alert('Demo video would play here. Add your demo video URL.');
        });
    }

    if (button.textContent.includes('Choose Plan')) {
        button.addEventListener('click', (e) => {
            const planName = e.target.closest('div').querySelector('h3').textContent;
            alert(\\\`You selected the \\\${planName} plan. Configure checkout with Stripe.\\\`);
        });
    }

    if (button.textContent.includes('Contact Sales')) {
        button.addEventListener('click', () => {
            alert('Contact form would open here. Add your sales contact form.');
        });
    }
});

console.log('Landing page loaded');`
        }
      ];
    } else {
      // Extract key terms from the prompt to customize the site
      const promptLower = userMessage.toLowerCase();

      // Check if this is a modification request for existing project
      const isModificationRequest = project.files.length > 0 && (
        promptLower.includes('make') || promptLower.includes('change') ||
        promptLower.includes('add') || promptLower.includes('update') ||
        promptLower.includes('dark') || promptLower.includes('theme')
      );

      if (isModificationRequest) {
        // Handle modification requests
        responseMessage = `I'll update your website based on your request: "${userMessage}"`;

        // Modify existing files based on request
        const currentFiles = [...project.files];

        // Check what kind of modification is requested
        const isDarkTheme = promptLower.includes('dark') && promptLower.includes('theme');
        const isLightTheme = promptLower.includes('light') && promptLower.includes('theme');
        const addingCards = promptLower.includes('card') || promptLower.includes('product');
        const addingFeature = promptLower.includes('add') && (promptLower.includes('feature') || promptLower.includes('section'));

        // Find and update CSS file for theme changes
        if (isDarkTheme || isLightTheme) {
          const cssFileIndex = currentFiles.findIndex(f => f.name === 'styles.css');
          if (cssFileIndex !== -1) {
            currentFiles[cssFileIndex].content = isDarkTheme ?
              `/* Dark Theme Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    background-color: #111827;
    color: #e5e7eb;
    min-height: 100vh;
}

nav {
    background-color: #1f2937 !important;
    border-bottom: 1px solid #374151 !important;
}

nav a {
    color: #e5e7eb !important;
}

nav a:hover {
    color: #60a5fa !important;
}

section {
    background-color: #111827 !important;
    color: #e5e7eb !important;
}

h1, h2, h3, h4, h5, h6 {
    color: #f3f4f6 !important;
}

.text-gray-500 {
    color: #9ca3af !important;
}

.text-gray-900 {
    color: #f3f4f6 !important;
}

.bg-white {
    background-color: #1f2937 !important;
}

.border-gray-200 {
    border-color: #374151 !important;
}

.bg-gray-50 {
    background-color: #1f2937 !important;
}

.bg-blue-600 {
    background-color: #2563eb !important;
}

.bg-blue-600:hover {
    background-color: #1d4ed8 !important;
}

.shadow {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.5) !important;
}

input, textarea {
    background-color: #374151 !important;
    border-color: #4b5563 !important;
    color: #e5e7eb !important;
}

footer {
    background-color: #1f2937 !important;
    border-top: 1px solid #374151;
}` :
              `/* Light Theme Styles - Clean and Modern */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #111827;
}

/* Custom styles can be added here */`;

            responseMessage = isDarkTheme ?
              "I've applied a dark theme to your website. All colors have been updated for better readability in dark mode." :
              "I've switched back to a light theme for your website.";
          }
        }

        // Handle adding cards/products
        if (addingCards) {
          const htmlFileIndex = currentFiles.findIndex(f => f.name === 'index.html');
          if (htmlFileIndex !== -1) {
            let htmlContent = currentFiles[htmlFileIndex].content || '';

            // Check if it's specifically about products
            if (promptLower.includes('product')) {
              // Add product cards section
              const productSection = `
    <!-- Products Section -->
    <section class="py-8 px-4 mx-auto max-w-screen-xl">
        <h2 class="mb-8 text-3xl font-bold text-center">Our Products</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg shadow">
                <img src="https://picsum.photos/400/300?random=10" alt="Product 1" class="rounded-t-lg w-full">
                <div class="p-5">
                    <h3 class="mb-2 text-xl font-bold">Premium Product</h3>
                    <p class="mb-3 text-gray-700">High-quality product with excellent features and durability.</p>
                    <p class="text-2xl font-bold text-blue-600">$99.99</p>
                    <button class="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add to Cart</button>
                </div>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow">
                <img src="https://picsum.photos/400/300?random=11" alt="Product 2" class="rounded-t-lg w-full">
                <div class="p-5">
                    <h3 class="mb-2 text-xl font-bold">Standard Product</h3>
                    <p class="mb-3 text-gray-700">Reliable product perfect for everyday use and great value.</p>
                    <p class="text-2xl font-bold text-blue-600">$49.99</p>
                    <button class="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add to Cart</button>
                </div>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow">
                <img src="https://picsum.photos/400/300?random=12" alt="Product 3" class="rounded-t-lg w-full">
                <div class="p-5">
                    <h3 class="mb-2 text-xl font-bold">Basic Product</h3>
                    <p class="mb-3 text-gray-700">Essential product with core features at an affordable price.</p>
                    <p class="text-2xl font-bold text-blue-600">$29.99</p>
                    <button class="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add to Cart</button>
                </div>
            </div>
        </div>
    </section>`;

              // Insert the product section before footer if it doesn't exist
              if (!htmlContent.includes('Our Products')) {
                htmlContent = htmlContent.replace('<!-- Footer -->', productSection + '\n\n    <!-- Footer -->');
                currentFiles[htmlFileIndex].content = htmlContent;
                responseMessage = "I've added a products section with three product cards to your website.";
              }
            } else {
              // Generic card addition
              const cardsSection = `
    <!-- Features Section -->
    <section class="py-8 px-4 mx-auto max-w-screen-xl">
        <h2 class="mb-8 text-3xl font-bold text-center">Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <i class="fas fa-rocket text-4xl text-blue-600 mb-4"></i>
                <h3 class="mb-2 text-xl font-bold">Fast Performance</h3>
                <p class="text-gray-700">Lightning-fast loading times and smooth user experience.</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <i class="fas fa-shield-alt text-4xl text-blue-600 mb-4"></i>
                <h3 class="mb-2 text-xl font-bold">Secure & Reliable</h3>
                <p class="text-gray-700">Built with security best practices and reliable infrastructure.</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <i class="fas fa-chart-line text-4xl text-blue-600 mb-4"></i>
                <h3 class="mb-2 text-xl font-bold">Analytics</h3>
                <p class="text-gray-700">Comprehensive analytics to track and improve performance.</p>
            </div>
        </div>
    </section>`;

              if (!htmlContent.includes('Features')) {
                htmlContent = htmlContent.replace('<!-- Footer -->', cardsSection + '\n\n    <!-- Footer -->');
                currentFiles[htmlFileIndex].content = htmlContent;
                responseMessage = "I've added feature cards to your website.";
              }
            }
          }
        }

        generatedFiles = currentFiles;

      } else {
        // Create new website from scratch
        responseMessage = `I'll create a new website for you. Here's a clean, modern site using Flowbite components.`;

        // Extract key terms from the prompt to customize the site
        const promptLower = userMessage.toLowerCase();

        // Generate a proper title based on the request
        let title = "My Website";

        // Try to extract a meaningful title from the prompt
        if (promptLower.includes('for')) {
          const forIndex = promptLower.indexOf('for');
          const afterFor = userMessage.substring(forIndex + 4).trim();
          title = afterFor.split(' ').slice(0, 3).map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        } else if (promptLower.includes('about')) {
          const aboutIndex = promptLower.indexOf('about');
          const afterAbout = userMessage.substring(aboutIndex + 6).trim();
          title = afterAbout.split(' ').slice(0, 3).map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        } else {
          // Default: use first few meaningful words
          const words = userMessage.split(' ').filter(word =>
            !['create', 'make', 'build', 'a', 'an', 'the', 'website', 'site', 'page'].includes(word.toLowerCase())
          );
          if (words.length > 0) {
            title = words.slice(0, 3).map(word =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          }
        }

        // Detect what kind of content to include based on the prompt
        const hasForm = promptLower.includes('form') || promptLower.includes('contact') ||
                       promptLower.includes('signup') || promptLower.includes('subscribe');
        const hasGallery = promptLower.includes('gallery') || promptLower.includes('photo') ||
                          promptLower.includes('image') || promptLower.includes('portfolio');
        const hasCards = promptLower.includes('card') || promptLower.includes('service') ||
                        promptLower.includes('feature') || promptLower.includes('product') ||
                        !hasForm && !hasGallery; // Default to cards if no specific type

      generatedFiles = [
        {
          name: 'index.html',
          type: 'file' as const,
          path: '/index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>` + title + `</title>
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="bg-white border-b border-gray-200">
        <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
            <span class="text-2xl font-semibold">` + title + `</span>
            <button data-collapse-toggle="navbar" type="button" class="md:hidden p-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <div class="hidden w-full md:block md:w-auto" id="navbar">
                <ul class="flex flex-col md:flex-row md:space-x-8 mt-4 md:mt-0">
                    <li><a href="#" class="block py-2 px-3 text-gray-900 hover:text-blue-600">Home</a></li>
                    <li><a href="#about" class="block py-2 px-3 text-gray-900 hover:text-blue-600">About</a></li>
                    <li><a href="#services" class="block py-2 px-3 text-gray-900 hover:text-blue-600">Services</a></li>
                    <li><a href="#contact" class="block py-2 px-3 text-gray-900 hover:text-blue-600">Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="bg-white">
        <div class="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
            <h1 class="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">
                ` + title + `
            </h1>
            <p class="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48">
                Welcome to our website. Explore our services and discover what we can do for you.
            </p>
            <div class="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                <a href="#" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-600 hover:bg-blue-700">
                    Get started
                </a>
                <a href="#" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-100">
                    Learn more
                </a>
            </div>
        </div>
    </section>

    ` + (hasCards ? `
    <!-- Features/Cards Section -->
    <section class="py-8 px-4 mx-auto max-w-screen-xl">
        <h2 class="mb-8 text-3xl font-bold text-center text-gray-900">Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <h3 class="mb-2 text-xl font-bold text-gray-900">Feature One</h3>
                <p class="text-gray-500">Description of the first feature or service offered.</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <h3 class="mb-2 text-xl font-bold text-gray-900">Feature Two</h3>
                <p class="text-gray-500">Description of the second feature or service offered.</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg shadow p-6">
                <h3 class="mb-2 text-xl font-bold text-gray-900">Feature Three</h3>
                <p class="text-gray-500">Description of the third feature or service offered.</p>
            </div>
        </div>
    </section>` : '') + `

    ` + (hasGallery ? `
    <!-- Gallery Section -->
    <section class="py-8 px-4 mx-auto max-w-screen-xl">
        <h2 class="mb-8 text-3xl font-bold text-center text-gray-900">Gallery</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <img src="https://picsum.photos/400/300?random=1" alt="Gallery image" class="rounded-lg">
            <img src="https://picsum.photos/400/300?random=2" alt="Gallery image" class="rounded-lg">
            <img src="https://picsum.photos/400/300?random=3" alt="Gallery image" class="rounded-lg">
            <img src="https://picsum.photos/400/300?random=4" alt="Gallery image" class="rounded-lg">
            <img src="https://picsum.photos/400/300?random=5" alt="Gallery image" class="rounded-lg">
            <img src="https://picsum.photos/400/300?random=6" alt="Gallery image" class="rounded-lg">
        </div>
    </section>` : '') + `

    ` + (hasForm ? `
    <!-- Contact Form -->
    <section id="contact" class="py-8 px-4 mx-auto max-w-screen-xl">
        <h2 class="mb-8 text-3xl font-bold text-center text-gray-900">Contact Us</h2>
        <form class="max-w-md mx-auto">
            <div class="mb-5">
                <label class="block mb-2 text-sm font-medium text-gray-900">Your email</label>
                <input type="email" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" placeholder="name@example.com" required>
            </div>
            <div class="mb-5">
                <label class="block mb-2 text-sm font-medium text-gray-900">Message</label>
                <textarea rows="4" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" placeholder="Your message..."></textarea>
            </div>
            <button type="submit" class="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center">Send Message</button>
        </form>
    </section>` : '') + `

    <!-- Footer -->
    <footer class="bg-gray-50 mt-12">
        <div class="mx-auto max-w-screen-xl p-4 py-6 lg:py-8">
            <div class="sm:flex sm:items-center sm:justify-between">
                <span class="text-sm text-gray-500">© 2024 ` + title + `. All Rights Reserved.</span>
                <div class="flex mt-4 space-x-6 sm:mt-0">
                    <a href="#" class="text-gray-500 hover:text-gray-900">Privacy Policy</a>
                    <a href="#" class="text-gray-500 hover:text-gray-900">Terms of Service</a>
                    <a href="#" class="text-gray-500 hover:text-gray-900">Contact</a>
                </div>
            </div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file' as const,
          path: '/styles.css',
          language: 'css',
          content: `/* Custom styles - Flowbite handles most styling */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #111827;
}

/* Add any custom styles here */`
        },
        {
          name: 'script.js',
          type: 'file' as const,
          path: '/script.js',
          language: 'javascript',
          content: `// Initialize website
console.log('Website loaded: ` + title + `');

// Add any custom JavaScript here
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle is handled by Flowbite

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});`
        }
      ];
      }
    }

    // Update files if we generated new ones
    if (generatedFiles.length > 0) {
      setProject({
        ...project,
        name: projectName,
        files: generatedFiles
      });
    }

    // Add the response message
    setMessages(prev => [...prev, { role: 'assistant', content: responseMessage }]);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsLoading(false);
  };

  const quickActions = project.files.length === 0 ? [
    { icon: 'fa-briefcase', label: 'Portfolio', prompt: 'Create a modern portfolio website with projects showcase' },
    { icon: 'fa-rocket', label: 'Landing Page', prompt: 'Build a landing page for a startup' },
    { icon: 'fa-store', label: 'E-commerce', prompt: 'Create an online store with product cards' },
    { icon: 'fa-blog', label: 'Blog', prompt: 'Design a personal blog with articles' },
  ] : [
    { icon: 'fa-plus', label: 'Add Feature', prompt: 'Add a new feature to my website' },
    { icon: 'fa-paint-brush', label: 'Improve Design', prompt: 'Improve the design and styling' },
    { icon: 'fa-mobile-alt', label: 'Make Responsive', prompt: 'Make the website mobile responsive' },
    { icon: 'fa-bolt', label: 'Add Animations', prompt: 'Add smooth animations and transitions' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center">
          <span className="w-8 h-8 bg-gray-800 border border-gray-700 rounded flex items-center justify-center text-gray-400 text-sm mr-3">
            <i className="fas fa-code"></i>
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            <p className="text-xs text-gray-500">Intelligent code generation</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setInput(action.prompt)}
              className="px-3 py-2 bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 rounded text-xs text-left transition-all text-gray-300 hover:text-white"
            >
              <i className={`fas ${action.icon} mr-2 text-gray-500`}></i>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0">
              {msg.role === 'user' ? (
                <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-xs text-gray-400"></i>
                </div>
              ) : (
                <span className="w-7 h-7 bg-gray-800 border border-gray-700 rounded flex items-center justify-center text-gray-400 text-xs">
                  <i className="fas fa-code"></i>
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="text-sm text-gray-200 whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <span className="w-7 h-7 bg-gray-800 border border-gray-700 rounded flex items-center justify-center text-gray-400 text-xs">
              <i className="fas fa-code"></i>
            </span>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">AI Assistant</div>
              <div className="text-sm text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="How can I help you build your website today? (Shift+Enter for new line)"
            className="flex-1 px-3 py-3 bg-[#0a0a0a] border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none min-h-[100px]"
            disabled={isLoading}
            rows={4}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 self-end"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;