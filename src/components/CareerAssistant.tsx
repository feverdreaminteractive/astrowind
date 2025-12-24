import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faLightbulb, faComments, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
// Using custom styled components instead of Flowbite due to Tailwind v4 compatibility

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const CareerAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load dynamic welcome message on component mount
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      try {
        const response = await fetch('/.netlify/functions/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '__WELCOME_MESSAGE__' // Special flag for welcome message
          })
        });

        if (response.ok) {
          const data = await response.json();
          setMessages([{
            id: '1',
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]);
        } else {
          // Fallback to static message if API fails
          setMessages([{
            id: '1',
            type: 'system',
            content: 'Hi! I\'m Ryan\'s AI assistant. I can help with coding questions, discuss my technical projects, or tell you about my development experience. What can I help you with?',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        // Fallback to static message if API fails
        setMessages([{
          id: '1',
          type: 'system',
          content: 'Hi! I\'m Ryan\'s AI assistant. I can help with coding questions, discuss my technical projects, or tell you about my development experience. What can I help you with?',
          timestamp: new Date()
        }]);
      } finally {
        setWelcomeLoaded(true);
      }
    };

    loadWelcomeMessage();
  }, []);

  const scrollToNewMessage = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const lastMessage = container.lastElementChild as HTMLElement;

      if (lastMessage) {
        // For assistant messages, scroll to show the beginning of the message
        // For user messages, scroll to bottom as normal
        const isAssistantMessage = lastMessage.getAttribute('data-message-type') === 'assistant';

        if (isAssistantMessage) {
          // Calculate the position of the message relative to the container
          const messageTop = lastMessage.offsetTop;
          // Add some padding to account for the header and avoid overlap
          const headerHeight = 80; // Approximate header height
          const paddingOffset = 16; // Additional padding for readability
          // Scroll the container to show the top of the assistant's response with offset
          container.scrollTo({
            top: Math.max(0, messageTop - headerHeight - paddingOffset),
            behavior: 'smooth'
          });
        } else {
          // For user messages and system messages, scroll to bottom
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  };

  useEffect(() => {
    // Only scroll within the chat container, never the page
    if (messages.length > 1) {
      const timer = setTimeout(() => {
        scrollToNewMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const sendMessageWithContent = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling Claude API:', error);

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling Claude API:', error);

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What's your technical background?",
    "Can you help me with a coding problem?",
    "Tell me about your leadership experience",
    "What makes you a strong candidate?"
  ];

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return <FontAwesomeIcon icon={faUser} className="text-blue-600" />;
      case 'assistant':
        return <FontAwesomeIcon icon={faRobot} className="text-purple-600" />;
      case 'system':
        return <FontAwesomeIcon icon={faLightbulb} className="text-gray-500" />;
      default:
        return <FontAwesomeIcon icon={faComments} className="text-gray-400" />;
    }
  };

  const getMessageBgColor = (type: Message['type']) => {
    const colors = {
      user: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
      assistant: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
      system: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
    };
    return colors[type];
  };

  return (
    <section className="w-full max-w-2xl mb-8">
      <div className="bg-white/70 dark:bg-primary-900/70 backdrop-blur-sm shadow-lg rounded-3xl border border-primary-200 dark:border-primary-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/90 to-blue-500/90 backdrop-blur-sm p-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faRobot} className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Ask About My Career
              </h2>
              <p className="text-purple-100 text-xs">
                Chat with my AI assistant about my experience & skills
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="h-80 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              data-message-type={message.type}
              className={`border rounded-lg p-3 ${getMessageBgColor(message.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  {getMessageIcon(message.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                      {message.type === 'assistant' ? "Ryan's AI Career Assistant" :
                       message.type === 'user' ? 'You' : 'Ryan'}
                    </span>
                    <span className="text-xs text-primary-500 dark:text-primary-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-primary-900 dark:text-primary-100">
                    <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="border border-purple-200 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faRobot} className="text-purple-600" />
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-primary-200 dark:border-primary-700">
          {messages.length === 1 && (
            <div className="mb-3">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-2">
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessageWithContent(question)}
                    className="px-3 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about Ryan's experience..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-primary-800 dark:text-primary-100 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white disabled:text-gray-200 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                  <span>Ask</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerAssistant;