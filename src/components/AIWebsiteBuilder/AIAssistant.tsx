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

// localStorage keys used to persist the conversation and the in-progress draft
// so prompts survive navigating away from the builder and back.
const MESSAGES_STORAGE_KEY = 'aiWebBuilder_chatMessages';
const DRAFT_STORAGE_KEY = 'aiWebBuilder_chatDraft';

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: "Ready to build.\n\nDescribe your project and I'll generate the code.\n\nExamples:\n• Modern portfolio with dark theme\n• SaaS landing page with pricing cards\n• E-commerce product showcase\n• Documentation site with sidebar nav\n• Dashboard with data visualizations\n\nWhat are we building?"
};

const AIAssistant: React.FC<Props> = ({ project, setProject, selectedFile, onFirstMessage }) => {
  // Restore the conversation from localStorage so prompts persist across navigation.
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
  // Restore any unsent draft so a half-typed prompt isn't lost on navigation.
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_STORAGE_KEY) || '';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);
  // First message is only "first" if no user prompt has been sent yet.
  const [isFirstMessage, setIsFirstMessage] = useState(
    () => !messages.some(m => m.role === 'user')
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist the conversation whenever it changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Persist the in-progress draft as the user types.
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

    // Try to use real AI first
    const USE_REAL_AI = true; // Set to false to use mock responses

    if (USE_REAL_AI) {
      try {
        // Prepare the API URL
        const apiUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:8888/.netlify/functions/claude'
          : '/.netlify/functions/claude';

        // Helpers ----------------------------------------------------------
        const languageFor = (name: string) =>
          name.endsWith('.html') ? 'html' :
          name.endsWith('.css') ? 'css' :
          name.endsWith('.js') ? 'javascript' : 'plaintext';

        // The model is asked to return raw file contents, but strip any stray
        // markdown fences or JSON markers just in case.
        const cleanContent = (raw: string) =>
          raw
            .replace(/<<<JSON_(START|END)>>>/g, '')
            .replace(/^\s*```[a-zA-Z]*\n?/, '')
            .replace(/```\s*$/, '')
            .trim();

        const upsertFile = (files: any[], node: any) => {
          const idx = files.findIndex((f: any) => f.name === node.name);
          if (idx === -1) return [...files, node];
          const next = [...files];
          next[idx] = { ...next[idx], ...node };
          return next;
        };

        const isModification = project.files.length > 0;
        const getExisting = (name: string) =>
          project.files.find((f: any) => f.name === name)?.content || '';

        // Decide which files to generate. For an existing project we regenerate
        // each existing file; for a new project we scaffold the standard three.
        const targets = isModification
          ? project.files
              .filter((f: any) => f.type !== 'folder')
              .map((f: any) => ({ name: f.name, path: f.path, language: f.language || languageFor(f.name) }))
          : [
              { name: 'index.html', path: '/index.html', language: 'html' },
              { name: 'styles.css', path: '/styles.css', language: 'css' },
              { name: 'script.js', path: '/script.js', language: 'javascript' },
            ];

        // Announce chunked generation so the user sees progress.
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `${isModification ? 'Updating' : 'Generating'} your site one file at a time (${targets.map((t: any) => t.name).join(', ')})…`
        }]);

        // Request each file in its own small request so responses stay fast and
        // never get truncated by the token limit. Update the project as we go.
        let workingFiles: any[] = [...project.files];
        const generated: Record<string, string> = {};

        for (const target of targets) {
          const html = generated['index.html'] ?? getExisting('index.html');
          const css = generated['styles.css'] ?? getExisting('styles.css');

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMessage,
              browserData: {
                isWebBuilder: true,
                targetFile: target.name,
                existingContent: getExisting(target.name),
                // Give CSS/JS the HTML (and JS the CSS) so they stay consistent.
                referenceHtml: target.name !== 'index.html' ? html : '',
                referenceCss: target.name === 'script.js' ? css : '',
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Request for ${target.name} failed with ${response.status}`);
          }

          const data = await response.json();
          const content = cleanContent(data.response || data.message || '');
          if (!content) {
            throw new Error(`Empty response for ${target.name}`);
          }

          generated[target.name] = content;

          // Persist this file immediately so the preview updates incrementally.
          const fileNode = {
            name: target.name,
            type: 'file' as const,
            path: target.path,
            language: target.language,
            content,
          };
          workingFiles = upsertFile(workingFiles, fileNode);
          setProject({
            ...project,
            name: project.name || 'ai-website',
            files: workingFiles,
          });

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✓ ${target.name}`
          }]);
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isModification
            ? "Done — updated your site."
            : "Done — your site is ready. Ask for any changes and I'll update it."
        }]);

        setIsLoading(false);
        if (isFirstMessage) {
          setIsFirstMessage(false);
          if (onFirstMessage) onFirstMessage();
        }
        return;
      } catch (error) {
        console.error('AI API error:', error);
        // Surface the failure honestly instead of substituting a canned
        // template. Previously any AI error fell through to a large keyword-based
        // mock, so prompts that merely resembled a "quick action" (portfolio,
        // blog, e-commerce, landing page) silently returned a default template.
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Something went wrong while generating your site. Please try again in a moment."
        }]);
        setIsLoading(false);
        return;
      }
    }
  };

  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');

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

  const handleFigmaImport = async () => {
    if (!figmaUrl.trim()) return;

    // Extract Figma file key from URL - supports both /file/ and /design/ formats
    const figmaFileKey = figmaUrl.match(/figma\.com\/(?:file|design)\/([^/?]+)/)?.[1];
    if (!figmaFileKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Please provide a valid Figma URL (e.g., https://www.figma.com/design/... or https://www.figma.com/file/...)'
      }]);
      return;
    }

    setInput(`Build a website from this Figma design: ${figmaUrl}`);
    setShowFigmaInput(false);
    setFigmaUrl('');
  };

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
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">Quick Actions</div>
          <button
            onClick={() => setShowFigmaInput(true)}
            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white transition-colors flex items-center gap-1"
            title="Import from Figma"
          >
            <svg className="w-3 h-3" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#1ABCFE" d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"/>
              <path fill="#0ACF83" d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"/>
              <path fill="#FF7262" d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"/>
              <path fill="#F24E1E" d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"/>
              <path fill="#A259FF" d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"/>
            </svg>
            Import Figma
          </button>
        </div>
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

      {/* Figma Import Modal */}
      {showFigmaInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 m-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#1ABCFE" d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"/>
                  <path fill="#0ACF83" d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"/>
                  <path fill="#FF7262" d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"/>
                  <path fill="#F24E1E" d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"/>
                  <path fill="#A259FF" d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"/>
                </svg>
                Import from Figma
              </h3>
              <button
                onClick={() => setShowFigmaInput(false)}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Paste your Figma file URL to convert the design to code
            </p>
            <input
              type="url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/file/..."
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleFigmaImport}
                disabled={!figmaUrl.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
              >
                Import Design
              </button>
              <button
                onClick={() => setShowFigmaInput(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="mt-4 p-3 bg-[#0a0a0a] border border-gray-800 rounded">
              <p className="text-xs text-gray-500">
                <i className="fas fa-info-circle mr-1"></i>
                Note: Make sure your Figma file is publicly accessible or you've provided a shareable link.
              </p>
            </div>
          </div>
        </div>
      )}

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