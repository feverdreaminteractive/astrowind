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

const SimpleAIAssistant: React.FC<Props> = ({ project, setProject, selectedFile, onFirstMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Describe what you want and I'll build it.\n\nExamples: 'e-commerce site', 'portfolio', 'landing page'"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll the message list's own scroll position directly, rather than
  // calling scrollIntoView() on a descendant — that scrolls every scrollable
  // ancestor needed to bring the target into view, including the page/window
  // itself if the list isn't already fully in the viewport.
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
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
      // Determine API endpoint
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:9999/.netlify/functions/claude'
        : '/.netlify/functions/claude';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          browserData: {
            isWebBuilder: true,
            url: window.location.href
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.response || data.message || '';

      // Try to parse the response
      const jsonStartIdx = responseText.indexOf('<<<JSON_START>>>');
      const jsonEndIdx = responseText.indexOf('<<<JSON_END>>>');

      if (jsonStartIdx !== -1 && jsonEndIdx !== -1) {
        const message = responseText.substring(0, jsonStartIdx).trim();
        const jsonStr = responseText.substring(jsonStartIdx + 16, jsonEndIdx).trim();

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.files && Array.isArray(parsed.files)) {
            // Update the project with generated files
            setProject({
              name: 'ai-website',
              files: parsed.files.map((f: any) => ({
                ...f,
                language: f.name.endsWith('.html') ? 'html' :
                          f.name.endsWith('.css') ? 'css' :
                          f.name.endsWith('.js') ? 'javascript' : 'plaintext'
              }))
            });

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: message || 'Website created!'
            }]);

            if (onFirstMessage) onFirstMessage();
          }
        } catch (e) {
          console.error('JSON parse error:', e);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Error parsing response. Please try again.'
          }]);
        }
      } else {
        // No JSON found - just show the message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText
        }]);
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

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
              <span className="animate-pulse">Generating...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe your website..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Build
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleAIAssistant;