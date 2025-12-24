import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faLightbulb, faComments, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Card, Button, TextInput, Badge, Spinner } from 'flowbite-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const CareerAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Hi! I\'m Ryan\'s AI career assistant. Ask me anything about his experience, skills, projects, or background. I\'m here to help you learn more about his professional journey!',
      timestamp: new Date()
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Auto-scroll to show the beginning of the latest AI response
    if (messages.length > 1) {
      const timer = setTimeout(() => {
        const latestMessage = messages[messages.length - 1];
        if (latestMessage.type === 'assistant') {
          // Find the latest AI message element and scroll to its top
          const messageElements = document.querySelectorAll('[data-message-type="assistant"]');
          const latestAIMessage = messageElements[messageElements.length - 1];
          if (latestAIMessage) {
            latestAIMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          scrollToBottom();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages]);

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
    "What's Ryan's technical background?",
    "Tell me about his leadership experience",
    "What projects has he built?",
    "What makes him unique as a developer?"
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
    <section className="w-full max-w-2xl mb-12">
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 -m-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faRobot} className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Ask About My Career
              </h2>
              <p className="text-purple-100 text-sm">
                Chat with my AI assistant about my experience & skills
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
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
                      {message.type === 'assistant' ? 'Career Assistant' :
                       message.type === 'user' ? 'You' : 'System'}
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
            <Card className="border-purple-200 bg-purple-50">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faRobot} className="text-purple-600" />
                <div className="flex items-center space-x-2">
                  <Spinner size="sm" color="purple" />
                  <span className="text-sm text-purple-700">
                    Thinking...
                  </span>
                </div>
              </div>
            </Card>
          )}

          <div ref={messagesEndRef} />
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
                  <Badge
                    key={index}
                    color="purple"
                    size="sm"
                    className="cursor-pointer hover:bg-purple-200 transition-colors"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <TextInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about Ryan's experience..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              color="purple"
              size="md"
            >
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
};

export default CareerAssistant;