import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPlay } from '@fortawesome/free-solid-svg-icons';
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [lastQuestionWasVoice, setLastQuestionWasVoice] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const lastQuestionWasVoiceRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Format markdown content for display
  const formatMarkdown = (text: string) => {
    // Split text into parts and process markdown
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\n)/g);

    return parts.map((part, index) => {
      // Bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      // Italic text
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1 py-0.5 bg-gray-100 rounded text-xs">{part.slice(1, -1)}</code>;
      }
      // Line breaks
      if (part === '\n') {
        return <br key={index} />;
      }
      // Regular text
      return <span key={index}>{part}</span>;
    });
  };

  // Load dynamic welcome message on component mount
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      try {
        // Track AI assistant initialization (skip for site owner)
        const isOwner = window.location.hostname === 'localhost' ||
                       window.location.hostname.includes('127.0.0.1') ||
                       localStorage.getItem('skip_analytics') === 'true';

        if (!isOwner && typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag('event', 'ai_assistant_loaded', {
            event_category: 'engagement',
            event_label: 'career_assistant'
          });
        }

        // Use the correct API endpoint based on deployment platform
        let apiUrl: string;

        if (window.location.hostname === 'localhost') {
          // Local development
          apiUrl = 'http://localhost:8888/.netlify/functions/claude';
        } else if (window.location.hostname.includes('onrender.com')) {
          // Deployed on Render - use Express API service
          apiUrl = 'https://portfolio-api-50l0.onrender.com/api/claude';
        } else {
          // Deployed on Netlify or custom domain - use Netlify Functions
          apiUrl = '/.netlify/functions/claude';
        }

        console.log('Loading welcome message from:', apiUrl);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '__WELCOME_MESSAGE__' // Special flag for welcome message
          })
        });

        if (response.ok) {
          const responseText = await response.text();
          console.log('Welcome response:', responseText);
          if (!responseText) {
            throw new Error('Empty response from API');
          }
          const data = JSON.parse(responseText);
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

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.length);

        // Filter for English voices and prioritize quality ones
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        setAvailableVoices(englishVoices);

        // Auto-select a good default voice
        const preferredVoices = englishVoices.filter(voice =>
          voice.name.includes('Professional') ||
          voice.name.includes('Natural') ||
          voice.name.includes('Enhanced') ||
          voice.name.includes('Premium') ||
          (voice.name.includes('Male') && voice.lang === 'en-US') ||
          (voice.name.includes('Female') && voice.lang === 'en-US')
        );

        if (preferredVoices.length > 0) {
          setSelectedVoice(preferredVoices[0]);
          console.log('Selected default voice:', preferredVoices[0].name);
        } else if (englishVoices.length > 0) {
          setSelectedVoice(englishVoices[0]);
          console.log('Selected fallback voice:', englishVoices[0].name);
        }
      }
    };

    // Load voices immediately
    loadVoices();

    // Also load when voices change (some browsers load them asynchronously)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        // Cancel any ongoing speech when component unmounts (e.g., page refresh)
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop speech only on page unload/refresh, but allow window switching
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };

    const handleVisibilityChange = () => {
      // Don't stop speech when window loses focus or becomes hidden
      // This allows users to switch windows/apps while audio continues playing
      // Speech will continue in background until page is actually closed/refreshed
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;  // Allow longer speech
      recognition.interimResults = true;  // Get partial results
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Process all results to get final transcript
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results while speaking
        if (interimTranscript) {
          setInput(interimTranscript);
        }

        // Process final result when user stops speaking
        if (finalTranscript) {
          setInput(finalTranscript);
          setIsListening(false);
          recognition.stop();

          // Track voice input usage
          const isOwner = window.location.hostname === 'localhost' ||
                         window.location.hostname.includes('127.0.0.1') ||
                         localStorage.getItem('skip_analytics') === 'true';

          if (!isOwner && typeof (window as any).gtag !== 'undefined') {
            (window as any).gtag('event', 'voice_input_used', {
              event_category: 'engagement',
              event_label: 'speech_recognition',
              transcript_length: finalTranscript.length
            });
          }

          // Auto-send the voice input to create interview experience
          setTimeout(() => {
            console.log('Voice input received:', finalTranscript, '- sending with voice flag = true');
            sendMessageWithContent(finalTranscript, true); // true = was voice input
            setInput(''); // Clear input after sending
          }, 100);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  const scrollToNewMessage = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const messages = container.children;

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1] as HTMLElement;
        const isAssistantMessage = lastMessage.getAttribute('data-message-type') === 'assistant';

        if (isAssistantMessage) {
          // Scroll to the top of the assistant message itself
          // This pins the beginning of the response at the top of the container
          setTimeout(() => {
            container.scrollTop = lastMessage.offsetTop - container.offsetTop;
          }, 50);
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

  const sendMessageWithContent = async (messageContent: string, wasVoiceInput = false) => {
    if (!messageContent.trim() || isLoading) return;

    // Update voice flag based on how the message was sent
    console.log('sendMessageWithContent called with wasVoiceInput:', wasVoiceInput);
    setLastQuestionWasVoice(wasVoiceInput);
    lastQuestionWasVoiceRef.current = wasVoiceInput;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Track question being asked with full question text (skip for site owner)
    const isOwner = window.location.hostname === 'localhost' ||
                   window.location.hostname.includes('127.0.0.1') ||
                   localStorage.getItem('skip_analytics') === 'true';

    if (!isOwner && typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'ai_question_asked', {
        event_category: 'engagement',
        event_label: 'career_question',
        custom_parameters: {
          question_text: messageContent.substring(0, 100), // First 100 chars for privacy
          question_full: messageContent, // Full question for detailed analysis
          question_length: messageContent.length,
          session_duration: Date.now() - (messages[0]?.timestamp?.getTime() || 0),
          message_number: messages.length,
          question_type: messageContent.includes('?') ? 'question' : 'statement',
          contains_keywords: {
            salary: messageContent.toLowerCase().includes('salary') || messageContent.toLowerCase().includes('compensation'),
            experience: messageContent.toLowerCase().includes('experience') || messageContent.toLowerCase().includes('background'),
            skills: messageContent.toLowerCase().includes('skill') || messageContent.toLowerCase().includes('technical'),
            leadership: messageContent.toLowerCase().includes('lead') || messageContent.toLowerCase().includes('manage'),
            projects: messageContent.toLowerCase().includes('project') || messageContent.toLowerCase().includes('built'),
            availability: messageContent.toLowerCase().includes('available') || messageContent.toLowerCase().includes('start'),
            culture: messageContent.toLowerCase().includes('culture') || messageContent.toLowerCase().includes('team'),
            remote: messageContent.toLowerCase().includes('remote') || messageContent.toLowerCase().includes('location')
          }
        }
      });

      // Track specific question categories
      const questionCategories = [
        { name: 'technical_skills', keywords: ['javascript', 'react', 'vue', 'typescript', 'aws', 'api', 'database'] },
        { name: 'leadership_experience', keywords: ['team', 'lead', 'manage', 'hire', 'mentor', 'direct'] },
        { name: 'specific_projects', keywords: ['project', 'built', 'created', 'developed', 'architected'] },
        { name: 'availability', keywords: ['available', 'start', 'notice', 'timeline', 'when'] },
        { name: 'compensation', keywords: ['salary', 'compensation', 'pay', 'benefits', 'equity'] },
        { name: 'work_style', keywords: ['remote', 'office', 'hybrid', 'culture', 'environment'] }
      ];

      questionCategories.forEach(category => {
        if (category.keywords.some(keyword => messageContent.toLowerCase().includes(keyword))) {
          (window as any).gtag('event', `question_${category.name}`, {
            event_category: 'question_analysis',
            event_label: category.name,
            question_preview: messageContent.substring(0, 50)
          });
        }
      });
    }

    try {
      // Get additional browser data for enhanced detection
      const browserData = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        sessionStart: messages[0]?.timestamp?.getTime() || Date.now(),
        messageCount: messages.length
      };

      // Use the correct API endpoint based on deployment platform
      let apiUrl: string;

      if (window.location.hostname === 'localhost') {
        apiUrl = 'http://localhost:8888/.netlify/functions/claude';
      } else if (window.location.hostname.includes('onrender.com')) {
        apiUrl = 'https://portfolio-api-50l0.onrender.com/api/claude';
      } else {
        apiUrl = '/.netlify/functions/claude';
      }

      console.log('Sending message to:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          browserData: browserData
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }

      if (!responseText) {
        throw new Error('Empty response from API');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak the response ONLY if the question was asked via microphone (interview mode)
      const shouldSpeak = voiceEnabled && lastQuestionWasVoiceRef.current;
      console.log('Speech check - voiceEnabled:', voiceEnabled, 'lastQuestionWasVoiceRef:', lastQuestionWasVoiceRef.current, 'shouldSpeak:', shouldSpeak);

      if (shouldSpeak) {
        console.log('Auto-speaking response for voice question:', data.message.substring(0, 50));
        // Small delay to let the message render first
        setTimeout(() => {
          speakText(data.message);
          // Reset voice question flag after speaking starts
          setLastQuestionWasVoice(false);
          lastQuestionWasVoiceRef.current = false;
        }, 500);
      } else {
        console.log('Not speaking - voiceEnabled:', voiceEnabled, 'lastQuestionWasVoiceRef:', lastQuestionWasVoiceRef.current);
        // Reset flag even if not speaking
        setLastQuestionWasVoice(false);
        lastQuestionWasVoiceRef.current = false;
      }
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
    const userInput = input;
    setInput('');
    await sendMessageWithContent(userInput, false); // false = not voice input
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown formatting for voice playback
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')     // Remove *italic*
      .replace(/`(.*?)`/g, '$1')       // Remove `code`
      .replace(/#{1,6}\s+/g, '')       // Remove # headers
      .replace(/^\s*[-*+]\s+/gm, '')   // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered lists
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [link](url)
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Configure voice settings
    utterance.rate = 1.1; // Natural speaking speed
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Use Alex voice consistently across all platforms
    const voices = window.speechSynthesis.getVoices();

    // Find Alex voice first, then fallback to similar professional male voices
    let selectedVoice = voices.find(voice => voice.name === 'Alex');

    if (!selectedVoice) {
      // Fallback to other professional male voices if Alex not available
      const fallbackVoices = voices.filter(voice =>
        voice.lang.startsWith('en') && (
          voice.name.includes('David') ||
          voice.name.includes('Guy') ||
          voice.name.includes('Male')
        )
      );

      if (fallbackVoices.length > 0) {
        selectedVoice = fallbackVoices[0];
      } else {
        // Last resort - any English voice
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        if (englishVoices.length > 0) {
          selectedVoice = englishVoices[0];
        }
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    // Track voice response usage
    const isOwner = window.location.hostname === 'localhost' ||
                   window.location.hostname.includes('127.0.0.1') ||
                   localStorage.getItem('skip_analytics') === 'true';

    if (!isOwner && typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'voice_response_played', {
        event_category: 'engagement',
        event_label: 'text_to_speech',
        response_length: text.length
      });
    }

    window.speechSynthesis.speak(utterance);
  };


  const suggestedQuestions = [
    "What's Ryan's technical background?",
    "What's Ryan's leadership experience?",
    "What makes Ryan a strong candidate?",
    "Tell me about Ryan's recent projects"
  ];


  return (
    <section className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="text-center py-3 px-4 border-b border-gray-100">
          <h2 className="text-lg font-light text-gray-900">
            What would you like to know?
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ask me about my experience, skills, or recent projects
          </p>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="h-40 overflow-y-auto p-3 space-y-2 bg-gray-50"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              data-message-type={message.type}
              className={`rounded-lg p-2.5 text-sm ${message.type === 'user' ? 'bg-white ml-8' : message.type === 'assistant' ? 'bg-white mr-8' : 'bg-gray-100'} border border-gray-200`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {message.type === 'assistant' ? "Assistant" :
                       message.type === 'user' ? 'You' : 'System'}
                    </span>
                    <div className="flex items-center gap-2">
                      {message.type === 'assistant' && (
                        <button
                          onClick={() => speakText(message.content)}
                          className="text-xs text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title="Play audio"
                        >
                          <FontAwesomeIcon icon={faPlay} />
                        </button>
                      )}
                      <span className="text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    <div className="whitespace-pre-wrap font-sans markdown-content">
                      {formatMarkdown(message.content)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="bg-white rounded-xl p-4 mr-12 border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent"></div>
                <span className="text-sm text-gray-500">
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100">
          {messages.length === 1 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">
                Suggested questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      // Track suggested question clicks (skip for site owner)
                      const isOwner = window.location.hostname === 'localhost' ||
                                     window.location.hostname.includes('127.0.0.1') ||
                                     localStorage.getItem('skip_analytics') === 'true';

                      if (!isOwner && typeof (window as any).gtag !== 'undefined') {
                        (window as any).gtag('event', 'suggested_question_clicked', {
                          event_category: 'engagement',
                          event_label: 'suggested_question',
                          question_text: question,
                          question_index: index
                        });
                      }
                      sendMessageWithContent(question, false);
                    }}
                    className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Type your question here..."}
              disabled={isLoading}
              className="w-full px-5 py-3 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-gray-400 transition-colors disabled:opacity-50 pr-20"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
              ) : (
                <FontAwesomeIcon icon={faPaperPlane} className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerAssistant;