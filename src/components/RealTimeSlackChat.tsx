import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ryan';
  timestamp: Date;
  typing?: boolean;
}

interface ChatState {
  isConnected: boolean;
  isTyping: boolean;
  ryanOnline: boolean;
  messages: Message[];
}

const RealTimeSlackChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    isConnected: false,
    isTyping: false,
    ryanOnline: false,
    messages: []
  });
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [hasIntroduced, setHasIntroduced] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chatState.messages]);

  // WebSocket connection
  useEffect(() => {
    if (isOpen && !wsRef.current) {
      // In production, this would be your WebSocket server
      // For now, we'll simulate the connection
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  const connectWebSocket = async () => {
    try {
      // For demo purposes, simulate WebSocket connection
      // In production: wsRef.current = new WebSocket('wss://your-websocket-server.com');

      setChatState(prev => ({ ...prev, isConnected: true, ryanOnline: true }));

      // Simulate welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "👋 Hey there! I'm getting notified in Slack right now. What's up?",
        sender: 'ryan',
        timestamp: new Date()
      };

      setTimeout(() => {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, welcomeMessage]
        }));
      }, 1000);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    // Send to Slack via API
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          userName: userName,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send message to Slack:', error);
    }

    setCurrentMessage('');

    // Simulate typing indicator
    setChatState(prev => ({ ...prev, isTyping: true }));
    setTimeout(() => {
      setChatState(prev => ({ ...prev, isTyping: false }));

      // Simulate response (in production this comes from Slack via WebSocket)
      const responses = [
        "Interesting! Tell me more about that.",
        "That sounds like a great project! I'd love to discuss it further.",
        "Thanks for reaching out! Let me think about that for a moment.",
        "That's exactly the kind of challenge I enjoy working on!",
        "Great question! I have some ideas about that."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'ryan',
        timestamp: new Date()
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, responseMessage]
      }));
    }, 2000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasIntroduced && userName.trim()) {
        setHasIntroduced(true);
        handleSendMessage();
      } else if (hasIntroduced) {
        handleSendMessage();
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-xs text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          •
        </span>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black bg-opacity-75 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Chat with Ryan in real-time!
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-96 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold">RC</span>
                </div>
                <div>
                  <h3 className="font-semibold">Ryan Clayton</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${chatState.ryanOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span>{chatState.ryanOnline ? 'Online in Slack' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
              {chatState.messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {chatState.isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 px-4 py-2 rounded-2xl shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              {!hasIntroduced && (
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="What's your name?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
              )}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={!hasIntroduced && !userName.trim() ? "Enter your name first..." : "Type a message..."}
                  disabled={!hasIntroduced && !userName.trim()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!hasIntroduced && !userName.trim()) || !currentMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💬 Messages go directly to Ryan's Slack • Usually responds within minutes
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RealTimeSlackChat;