import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faRobot, faLightbulb, faComments, faPaperPlane,
  faMicrophone, faMicrophoneSlash, faVolumeUp, faVolumeMute,
  faPause, faPlay, faHandshake, faArrowRight, faCheckCircle,
  faStar, faRocket
} from '@fortawesome/free-solid-svg-icons';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'transition';
  content: string;
  timestamp: Date;
  metadata?: {
    interviewScore?: number;
    qualifiedCandidate?: boolean;
    candidateProfile?: any;
  };
}

interface InterviewData {
  responses: string[];
  score: number;
  qualifiedForSlack: boolean;
  candidateName?: string;
  candidateEmail?: string;
  experience?: string;
  skills?: string[];
}

const SmartRecruitingFlow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastQuestionWasVoice, setLastQuestionWasVoice] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [showSlackTransition, setShowSlackTransition] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    company: ''
  });

  const lastQuestionWasVoiceRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load dynamic welcome message
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      try {
        const response = await fetch('/.netlify/functions/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '__WELCOME_RECRUITING__'
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
          setMessages([{
            id: '1',
            type: 'system',
            content: '👋 Hi! I\'m Ryan\'s AI recruiting assistant. I\'ll conduct a brief interview to understand your background and needs. Based on our conversation, I may connect you directly with Ryan for immediate discussion. Ready to start?',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        setMessages([{
          id: '1',
          type: 'system',
          content: '👋 Hi! I\'m Ryan\'s AI recruiting assistant. I\'ll conduct a brief interview to understand your background and needs. Based on our conversation, I may connect you directly with Ryan for immediate discussion. Ready to start?',
          timestamp: new Date()
        }]);
      } finally {
        setWelcomeLoaded(true);
      }
    };

    loadWelcomeMessage();
  }, []);

  // Initialize speech recognition (keeping existing logic)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(finalTranscript);
          setIsListening(false);
          recognition.stop();

          setTimeout(() => {
            sendMessageWithContent(finalTranscript, true);
            setInput('');
          }, 100);
        }
      };

      setSpeechRecognition(recognition);
    }
  }, []);

  const analyzeInterviewProgress = (allMessages: Message[]): InterviewData => {
    const userResponses = allMessages.filter(m => m.type === 'user').map(m => m.content);
    const messageCount = userResponses.length;

    // Analyze responses for qualification scoring
    const analysisKeywords = {
      experience: ['years', 'experience', 'worked', 'developed', 'built', 'led', 'managed'],
      skills: ['javascript', 'react', 'python', 'aws', 'api', 'database', 'typescript', 'node'],
      seniority: ['senior', 'lead', 'architect', 'principal', 'manager', 'director'],
      relevant: ['hire', 'recruit', 'opportunity', 'position', 'role', 'job', 'career']
    };

    let score = 0;
    let qualifiedForSlack = false;

    // Score based on content quality
    userResponses.forEach(response => {
      const lowerResponse = response.toLowerCase();

      Object.values(analysisKeywords).forEach(keywords => {
        keywords.forEach(keyword => {
          if (lowerResponse.includes(keyword)) {
            score += 1;
          }
        });
      });
    });

    // Qualification thresholds
    if (messageCount >= 3 && score >= 5) {
      qualifiedForSlack = true;
    }

    return {
      responses: userResponses,
      score,
      qualifiedForSlack,
      candidateName: extractNameFromMessages(allMessages),
      experience: extractExperienceFromMessages(allMessages)
    };
  };

  const extractNameFromMessages = (allMessages: Message[]): string => {
    for (const message of allMessages) {
      if (message.type === 'user') {
        const nameMatch = message.content.match(/(?:i'm|my name is|i am|call me)\s+([a-zA-Z\s]+)/i);
        if (nameMatch) {
          return nameMatch[1].trim();
        }
      }
    }
    return '';
  };

  const extractExperienceFromMessages = (allMessages: Message[]): string => {
    const userMessages = allMessages.filter(m => m.type === 'user');
    return userMessages.map(m => m.content).join(' ');
  };

  const sendMessageWithContent = async (messageContent: string, wasVoiceInput = false) => {
    if (!messageContent.trim() || isLoading) return;

    setLastQuestionWasVoice(wasVoiceInput);
    lastQuestionWasVoiceRef.current = wasVoiceInput;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          context: 'recruiting_interview',
          messageHistory: updatedMessages
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Analyze interview progress
      const analysis = analyzeInterviewProgress(finalMessages);
      setInterviewData(analysis);

      // Check if candidate qualifies for Slack transition
      if (analysis.qualifiedForSlack && !showSlackTransition) {
        setTimeout(() => {
          triggerSlackTransition(analysis);
        }, 2000);
      }

      // Handle voice response
      if (voiceEnabled && lastQuestionWasVoiceRef.current) {
        setTimeout(() => {
          speakText(data.message);
          setLastQuestionWasVoice(false);
          lastQuestionWasVoiceRef.current = false;
        }, 500);
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

  const triggerSlackTransition = (analysis: InterviewData) => {
    const transitionMessage: Message = {
      id: `transition_${Date.now()}`,
      type: 'transition',
      content: `🎉 Great conversation! Based on our chat, I think you'd be a fantastic fit for Ryan's network.

**Interview Summary:**
• ${analysis.responses.length} thoughtful responses
• Qualification Score: ${analysis.score}/10
• ${analysis.candidateName ? `Name: ${analysis.candidateName}` : 'Qualified candidate'}

I'd like to connect you directly with Ryan for real-time discussion. Would you like to switch to live chat with him? He typically responds within minutes!`,
      timestamp: new Date(),
      metadata: {
        interviewScore: analysis.score,
        qualifiedCandidate: analysis.qualifiedForSlack,
        candidateProfile: analysis
      }
    };

    setMessages(prev => [...prev, transitionMessage]);
    setShowSlackTransition(true);
  };

  const handleSlackTransition = async () => {
    if (!candidateInfo.name || !candidateInfo.email) {
      alert('Please fill in your name and email to connect with Ryan directly.');
      return;
    }

    try {
      // Send interview summary to Slack
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🔥 QUALIFIED CANDIDATE READY FOR LIVE CHAT

**Candidate:** ${candidateInfo.name}
**Email:** ${candidateInfo.email}
**Company:** ${candidateInfo.company || 'Not specified'}

**AI Interview Summary:**
• Score: ${interviewData?.score}/10 ✨
• Responses: ${interviewData?.responses.length}
• Key Skills/Experience: ${interviewData?.experience?.substring(0, 200)}...

**Full Interview Transcript:**
${messages.filter(m => m.type === 'user' || m.type === 'assistant').map(m =>
  `${m.type === 'user' ? '👤 Candidate' : '🤖 AI'}: ${m.content}`
).join('\n\n')}

🚀 Candidate is requesting live chat transition!`,
          userName: candidateInfo.name,
          timestamp: new Date().toISOString(),
          isInterviewHandoff: true
        })
      });

      if (response.ok) {
        // Replace the current interface with live chat
        window.dispatchEvent(new CustomEvent('startLiveChat', {
          detail: {
            candidateInfo,
            interviewData,
            preMessage: `Hi Ryan! I just completed the AI interview. I'm ${candidateInfo.name} from ${candidateInfo.company}. Looking forward to discussing potential opportunities!`
          }
        }));
      } else {
        throw new Error('Failed to notify Ryan');
      }
    } catch (error) {
      console.error('Error transitioning to Slack:', error);
      alert('Sorry, there was an error connecting to Ryan. Please try again.');
    }
  };

  // Voice and messaging functions (keeping existing speakText, toggleVoiceInput, etc.)
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
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

  const handleSendMessage = () => {
    const userInput = input;
    setInput('');
    sendMessageWithContent(userInput, false);
  };

  const suggestedQuestions = [
    "I'm interested in discussing opportunities",
    "Tell me about Ryan's technical leadership",
    "What's Ryan looking for in his next role?",
    "I have a position that might be perfect"
  ];

  return (
    <section className="w-full max-w-2xl mb-8">
      <div className="bg-white/70 dark:bg-primary-900/70 backdrop-blur-sm shadow-lg rounded-3xl border border-primary-200 dark:border-primary-700 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/90 to-blue-500/90 backdrop-blur-sm p-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={showSlackTransition ? faHandshake : faRobot} className="text-white text-lg" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                {showSlackTransition ? "Connect with Ryan" : "AI Career Interview"}
              </h2>
              <p className="text-purple-100 text-xs">
                {showSlackTransition
                  ? "Qualified for direct Slack communication"
                  : "Smart screening → Live chat with qualified candidates"
                }
              </p>
            </div>
            {interviewData && (
              <div className="text-right">
                <div className="text-white text-xs font-semibold">
                  Score: {interviewData.score}/10
                </div>
                <div className="flex text-yellow-300">
                  {[...Array(Math.min(5, Math.floor(interviewData.score / 2)))].map((_, i) => (
                    <FontAwesomeIcon key={i} icon={faStar} className="w-3 h-3" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="h-80 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`border rounded-lg p-3 ${
              message.type === 'transition'
                ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
                : message.type === 'user'
                ? 'bg-blue-50 border-blue-200'
                : message.type === 'assistant'
                ? 'bg-purple-50 border-purple-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <FontAwesomeIcon icon={
                    message.type === 'transition' ? faRocket :
                    message.type === 'user' ? faUser :
                    message.type === 'assistant' ? faRobot : faLightbulb
                  } className={
                    message.type === 'transition' ? 'text-green-600' :
                    message.type === 'user' ? 'text-blue-600' :
                    message.type === 'assistant' ? 'text-purple-600' : 'text-gray-500'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary-700 mb-1">
                    {message.type === 'transition' ? 'Interview Complete!' :
                     message.type === 'assistant' ? "AI Recruiter" :
                     message.type === 'user' ? 'You' : 'System'}
                  </div>
                  <div className="text-sm text-primary-900">
                    <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faRobot} className="text-purple-600" />
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                  <span className="text-sm text-purple-700">Analyzing response...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Slack Transition Form */}
        {showSlackTransition && (
          <div className="p-4 border-t border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Connect Directly with Ryan
              </h3>
              <p className="text-xs text-green-700 mb-3">
                You've qualified for live chat! Fill in your details to start real-time conversation.
              </p>
            </div>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Your name"
                value={candidateInfo.name}
                onChange={(e) => setCandidateInfo(prev => ({...prev, name: e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <input
                type="email"
                placeholder="Your email"
                value={candidateInfo.email}
                onChange={(e) => setCandidateInfo(prev => ({...prev, email: e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                placeholder="Your company (optional)"
                value={candidateInfo.company}
                onChange={(e) => setCandidateInfo(prev => ({...prev, company: e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSlackTransition}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 hover:from-green-600 hover:to-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faRocket} />
              <span>Start Live Chat with Ryan</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        )}

        {/* Regular Input (hidden when showing Slack transition) */}
        {!showSlackTransition && (
          <div className="p-4 border-t border-primary-200 dark:border-primary-700">
            {messages.length === 1 && (
              <div className="mb-3">
                <p className="text-xs text-primary-700 mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessageWithContent(question, false)}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder={isListening ? "Listening..." : "Tell me about yourself and what you're looking for..."}
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm border border-primary-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } disabled:opacity-50`}
              >
                <FontAwesomeIcon icon={isListening ? faMicrophoneSlash : faMicrophone} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SmartRecruitingFlow;