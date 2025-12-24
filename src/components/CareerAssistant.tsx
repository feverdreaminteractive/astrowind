import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faLightbulb, faComments, faPaperPlane, faMicrophone, faMicrophoneSlash, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
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
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);

        // Track voice input usage
        const isOwner = window.location.hostname === 'localhost' ||
                       window.location.hostname.includes('127.0.0.1') ||
                       localStorage.getItem('skip_analytics') === 'true';

        if (!isOwner && typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag('event', 'voice_input_used', {
            event_category: 'engagement',
            event_label: 'speech_recognition',
            transcript_length: transcript.length
          });
        }

        // Auto-send the voice input to create interview experience
        setTimeout(() => {
          console.log('Voice input received:', transcript, '- sending with voice flag = true');
          sendMessageWithContent(transcript, true); // true = was voice input
          setInput(''); // Clear input after sending
        }, 100);
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

      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          browserData: browserData
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

  const toggleVoiceInput = () => {
    if (!speechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      speechRecognition.stop();
    } else {
      speechRecognition.start();
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Use a specific preferred voice for professional sound
    const voices = window.speechSynthesis.getVoices();

    // Debug: Log all available voices (remove this later)
    console.log('Available voices:');
    voices.forEach((voice, index) => {
      console.log(`${index}: ${voice.name} (${voice.lang}) - ${voice.localService ? 'Local' : 'Remote'}`);
    });

    // Priority order for best interview/professional voices
    const preferredVoiceNames = [
      'Samantha',           // macOS - Natural, professional female
      'Alex',               // macOS - Professional male
      'Ava (Premium)',      // iOS/macOS - High quality female
      'Microsoft Aria Online (Natural)', // Windows - Professional female
      'Microsoft Guy Online (Natural)',  // Windows - Professional male
      'Google UK English Female',        // Chrome - Clear female
      'Google UK English Male',          // Chrome - Clear male
      'Microsoft Zira Desktop',          // Windows - Reliable female
      'Microsoft David Desktop'          // Windows - Reliable male
    ];

    let selectedVoice = null;

    // Try to find preferred voices in order
    for (const voiceName of preferredVoiceNames) {
      const voice = voices.find(v => v.name === voiceName);
      if (voice) {
        selectedVoice = voice;
        break;
      }
    }

    // Fallback to any high-quality English voice
    if (!selectedVoice) {
      const fallbackVoices = voices.filter(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.includes('Enhanced') ||
         voice.name.includes('Premium') ||
         voice.name.includes('Natural'))
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

  const toggleVoiceResponse = () => {
    setVoiceEnabled(!voiceEnabled);

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                Ask About My Career
              </h2>
              <p className="text-purple-100 text-xs">
                Chat with my AI assistant about my experience & skills
              </p>
            </div>
            <button
              onClick={toggleVoiceResponse}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              title={voiceEnabled ? "Voice responses enabled - Click to disable" : "Voice responses disabled - Click to enable"}
            >
              <FontAwesomeIcon
                icon={voiceEnabled ? faVolumeUp : faVolumeMute}
                className={`text-white text-sm ${isSpeaking ? 'animate-pulse' : ''}`}
              />
            </button>
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
                    className="px-3 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask me about Ryan's experience..."}
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-primary-800 dark:text-primary-100 disabled:opacity-50"
            />
            <button
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <FontAwesomeIcon
                icon={isListening ? faMicrophoneSlash : faMicrophone}
                className="w-4 h-4"
              />
            </button>
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