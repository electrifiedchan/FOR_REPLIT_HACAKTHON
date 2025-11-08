import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '@tensorflow/tfjs';
import './App.css';
import LandingPage from './LandingPage';
import MoodTracker from './MoodTracker';
import PetRoom from './PetRoom';
import VoiceSentiment from './VoiceSentiment';
import VideoSentiment from './VideoSentiment';

function App() {
  // --- STATE VARIABLES ---
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showNameInput, setShowNameInput] = useState(true);
  const [currentPage, setCurrentPage] = useState('chat');
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hello! How are you feeling today?', timestamp: new Date().toISOString() }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [crisisLevel, setCrisisLevel] = useState('none');
  const [fontSize, setFontSize] = useState('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [sessionStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [moodHistory, setMoodHistory] = useState([]);
  const [moodTrend, setMoodTrend] = useState('neutral');
  const [networkStatus, setNetworkStatus] = useState('online');
  const [unreadPetNotifications, setUnreadPetNotifications] = useState(false);
  const [lastVoiceResponseTime, setLastVoiceResponseTime] = useState(0);
  
  // --- NEW: Additional features for hackathon ---
  const [isTyping, setIsTyping] = useState(false);
  const [breathingExerciseActive, setBreathingExerciseActive] = useState(false);
  const [voiceEmotionBuffer, setVoiceEmotionBuffer] = useState([]); // For voice buffering
  const [isVideoActive, setIsVideoActive] = useState(false); // Video sentiment state
  const [lastVideoResponseTime, setLastVideoResponseTime] = useState(0);
  
  // Refs
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- CONSTANTS ---
  const QUICK_REPLIES = useMemo(() => [
    { text: '😊 Happy', emoji: '😊', mood: 'happy', value: 5 },
    { text: '😔 Sad', emoji: '😔', mood: 'sad', value: 2 },
    { text: '😰 Anxious', emoji: '😰', mood: 'anxious', value: 3 },
    { text: '😡 Frustrated', emoji: '😡', mood: 'frustrated', value: 2 },
    { text: '😐 Neutral', emoji: '😐', mood: 'neutral', value: 3 }
  ], []);

  const MOOD_DESCRIPTIONS = useMemo(() => ({
    happy: "That's wonderful! I'm glad you're feeling happy.",
    sad: "I hear you. It's okay to feel sad. I'm here to listen.",
    anxious: "Anxiety is tough. Take a deep breath. You're not alone.",
    frustrated: "Frustration is valid. Let's work through this together.",
    neutral: "Feeling neutral? That's a good baseline to build from."
  }), []);

  // --- PERFORMANCE: Memoize visible messages ---
  const visibleMessages = useMemo(() => {
    return messages.slice(-50);
  }, [messages]);

  // --- CRISIS DETECTION ---
  const detectCrisisLevel = useCallback((message) => {
    const lowerMessage = message.toLowerCase();
    const severeCrisis = ['suicide', 'kill myself', 'end my life', 'want to die', 'better off dead'];
    const moderateCrisis = ['self harm', 'hurt myself', 'no point', 'give up', 'can\'t take it'];
    const mildConcern = ['hopeless', 'worthless', 'can\'t go on', 'too much', 'no one cares'];
    
    if (severeCrisis.some(k => lowerMessage.includes(k))) return 'severe';
    if (moderateCrisis.some(k => lowerMessage.includes(k))) return 'moderate';
    if (mildConcern.some(k => lowerMessage.includes(k))) return 'mild';
    return 'none';
  }, []);

  const calculateMoodTrend = useCallback((history) => {
    if (history.length === 0) return 'neutral';
    const recentMoods = history.slice(-5);
    const avgValue = recentMoods.reduce((sum, item) => sum + (item.value || 3), 0) / recentMoods.length;
    if (avgValue >= 4.5) return 'very-positive';
    if (avgValue >= 3.5) return 'positive';
    if (avgValue <= 2.5) return 'negative';
    return 'neutral';
  }, []);

  const getMoodColor = useCallback((trend) => {
    const colors = {
      'very-positive': '#4ecdc4',
      'positive': '#8b7ab8',
      'neutral': '#b8a5e0',
      'negative': '#ff8787'
    };
    return colors[trend] || '#b8a5e0';
  }, []);

  const appStyle = useMemo(() => ({
    '--primary-color': getMoodColor(moodTrend),
    '--glow-intensity': moodTrend === 'very-positive' ? '20px' : '10px'
  }), [moodTrend, getMoodColor]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const logAnalytics = useCallback((eventType, data = {}) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${eventType}:`, data);
  }, []);

  const getSessionDuration = useCallback(() => {
    const now = currentTime;
    const diff = Math.floor((now - sessionStartTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }, [currentTime, sessionStartTime]);

  // --- NEW: Breathing Exercise ---
  const startBreathingExercise = useCallback(() => {
    if (breathingExerciseActive) return; // Prevent multiple clicks

    setBreathingExerciseActive(true);
    logAnalytics('FEATURE_USE', { feature: 'breathing_exercise' });
    
    const breathingMessage = {
      from: 'bot',
      text: "Let's take a moment to breathe together. 🧘‍♀️\n\n• Inhale deeply for 4 seconds\n• Hold for 4 seconds\n• Exhale slowly for 4 seconds\n• Hold for 4 seconds\n\nRepeat 3 times. I'll wait here for you.",
      timestamp: new Date().toISOString(),
      isBreathing: true
    };
    setMessages(prev => [...prev, breathingMessage]);
    
    setTimeout(() => {
      const followUp = {
        from: 'bot',
        text: "How are you feeling now? Sometimes just a minute of breathing can make a difference. 💚",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, followUp]);
      setBreathingExerciseActive(false);
    }, 60000); // 60 seconds
  }, [breathingExerciseActive, logAnalytics]); // Add dependency

  // --- NEW: Input change with typing indicator ---
  const handleInputChange = useCallback((e) => {
    setUserInput(e.target.value);
    
    if (!isTyping) setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [isTyping]);

  // --- EFFECTS ---
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (!showNameInput && currentPage === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNameInput, currentPage]);

  useEffect(() => {
    const trend = calculateMoodTrend(moodHistory);
    setMoodTrend(trend);
  }, [moodHistory, calculateMoodTrend]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (moodTrend === 'negative' && currentPage === 'chat') {
      setUnreadPetNotifications(true);
    }
  }, [moodTrend, currentPage]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // --- PROACTIVE WELLNESS NUDGE ---
  useEffect(() => {
    if (moodHistory.length >= 3) {
      const recentMoods = moodHistory.slice(-3);
      const allNegative = recentMoods.every(m => m.value <= 2);
      
      if (allNegative && messages.length > 0 && !messages[messages.length - 1]?.isProactive && !messages[messages.length - 1]?.hasBreathingOption) {
        const supportMessage = {
          from: 'bot',
          text: `${userName}, I've noticed you've been feeling down. Remember, it's okay to not be okay. Would you like to try a breathing exercise? 🧘‍♀️`,
          timestamp: new Date().toISOString(),
          isProactive: true,
          hasBreathingOption: true
        };
        
        const timer = setTimeout(() => {
          setMessages(prev => [...prev, supportMessage]);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [moodHistory, userName, messages]);

  // --- HANDLER FUNCTIONS ---
  const handleStartChat = useCallback(() => {
    logAnalytics('USER_ACTION', { action: 'Started chat from landing page' });
    setShowLandingPage(false);
  }, [logAnalytics]);

  const handleNameSubmit = useCallback(() => {
    if (userName.trim().length < 2) {
      logAnalytics('VALIDATION_ERROR', { reason: 'Name too short' });
      return;
    }
    logAnalytics('USER_INFO', { userName, nameLength: userName.length });
    setShowNameInput(false);
    setMessages(prev => [
      ...prev,
      {
        from: 'bot',
        text: `Nice to meet you, ${userName}! 💚 I'm here to listen without judgment. What's on your mind today?`,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [userName, logAnalytics]);

  // --- MAIN SEND FUNCTION (Refactored to accept text) ---
  const handleSend = useCallback(async (messageText) => {
    if (messageText.trim() === '') return;
    
    if (networkStatus === 'offline') {
      const offlineMessage = {
        from: 'bot',
        text: '🔌 You appear to be offline. Please check your internet connection.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, offlineMessage]);
      return;
    }

    // Check for breathing exercise trigger
    const lowerMessage = messageText.toLowerCase();
    if (!breathingExerciseActive && (
        lowerMessage.includes('breathing') || 
        lowerMessage.includes('breathe') ||
        lowerMessage.includes('calm down') ||
        (lowerMessage.includes('yes') && messages[messages.length - 1]?.hasBreathingOption)
    )) {
      startBreathingExercise();
      setUserInput(''); // Clear input even if it was a quick reply
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const crisisDetected = detectCrisisLevel(messageText);
    if (crisisDetected !== 'none') {
      setCrisisLevel(crisisDetected);
      logAnalytics('CRISIS_DETECTED', { level: crisisDetected, message: messageText });
    }

    // Add user message to chat (if it's not already there from quick reply)
    if (userInput.trim() !== '') {
       const userMessage = {
        from: 'user',
        text: messageText,
        timestamp: new Date().toISOString(),
        crisisLevel: crisisDetected
      };
      setMessages(prevMessages => [...prevMessages, userMessage]);
    }
    
    setUserInput(''); // Clear input
    setIsLoading(true);
    setMessageCount(prev => prev + 1);

    try {
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 30000);

      const startTime = performance.now();

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionStartTime.getTime().toString()
        },
        body: JSON.stringify({
          message: messageText,
          userName: userName,
          moodHistory: moodHistory.slice(-10),
          messageCount: messageCount,
          crisisLevel: crisisDetected
        }),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Math.round(performance.now() - startTime);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      logAnalytics('API_RESPONSE', {
        responseTime: `${responseTime}ms`,
        isCrisis: data.is_crisis,
        model: data.model
      });

      if (data.is_crisis) {
        setCrisisLevel(prev => (prev === 'none' ? 'moderate' : prev));
      }

      const botMessage = {
        from: 'bot',
        text: data.response,
        timestamp: new Date().toISOString(),
        model: data.model,
        responseTime: responseTime,
        isCrisis: data.is_crisis
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      let errorText = `I'm sorry ${userName}, I'm having trouble connecting. `;
      if (error.name === 'AbortError') {
        errorText += '⏱️ The request took too long. Please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorText += '🔌 Check your internet connection and try again.';
      } else if (error.message.includes('Server error: 500')) {
        errorText += '⚠️ Server error. Please try again later.';
      } else {
        errorText += '⚙️ Please try again in a moment.';
      }
      const errorMessage = {
        from: 'bot',
        text: errorText,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, userName, detectCrisisLevel, moodHistory, messageCount, networkStatus, sessionStartTime, logAnalytics, startBreathingExercise, breathingExerciseActive, messages]);

  // --- LOGIC FIX: handleQuickReply ---
  const handleQuickReply = useCallback((reply) => {
    logAnalytics('QUICK_REPLY', { reply: reply.text, mood: reply.mood, value: reply.value });
    
    const moodEntry = {
      emoji: reply.emoji,
      mood: reply.mood,
      value: reply.value,
      timestamp: new Date().toISOString(),
      text: reply.text,
      source: 'button'
    };
    setMoodHistory(prevHistory => [...prevHistory, moodEntry]);
    
    // Add user's click to chat
    const userMessage = {
      from: 'user',
      text: reply.text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // NOW, send the text to the AI for a response
    handleSend(reply.text); 
    
  }, [logAnalytics, handleSend]); // Added handleSend

  // --- VOICE HANDLER (UPGRADED) ---
  const handleSentimentDetected = useCallback((data) => {
    logAnalytics('VOICE_SENTIMENT', data);
    
    const now = Date.now();
    const cooldown = 10000; // 10s cooldown
    
    if (now - lastVoiceResponseTime < cooldown) {
      console.log('Voice cooldown active.');
      return;
    }

    const emotionToMoodMap = {
      'happy': { emoji: '😊', value: 5, mood: 'happy' },
      'sad': { emoji: '😔', value: 2, mood: 'sad' },
      'angry': { emoji: '😡', value: 2, mood: 'frustrated' },
      'fearful': { emoji: '😰', value: 2, mood: 'anxious' },
      'anxious': { emoji: '😰', value: 3, mood: 'anxious' },
      'positive': { emoji: '😊', value: 4, mood: 'happy' },
      'negative': { emoji: '😔', value: 2, mood: 'sad' },
      'surprised': { emoji: '😲', value: 4, mood: 'neutral' },
      'neutral': { emoji: '😐', value: 3, mood: 'neutral' },
      'calm': { emoji: '😌', value: 4, mood: 'neutral' },
      'disgust': { emoji: '🤢', value: 2, mood: 'frustrated' }
    };

    // Buffer logic
    const newEmotionEntry = {
      emotion: data.emotion,
      confidence: data.confidence || 0.5,
      timestamp: now
    };
    
    let dominantEmotion = data.emotion; // Default to current detection

    setVoiceEmotionBuffer(prev => {
      const updated = [...prev, newEmotionEntry].filter(e => now - e.timestamp < 5000); // Keep last 5 seconds
      
      if (updated.length >= 2) {
        const emotionScores = {};
        updated.forEach(entry => {
          const weight = entry.confidence;
          emotionScores[entry.emotion] = (emotionScores[entry.emotion] || 0) + weight;
        });
        
        dominantEmotion = Object.entries(emotionScores)
          .sort((a, b) => b[1] - a[1])[0][0];
      }
      return updated;
    });

    // Only process if confidence is high enough
    if (data.confidence < 0.65) {
      console.log(`Voice emotion ${data.emotion} below confidence threshold.`);
      return;
    }

    const moodData = emotionToMoodMap[dominantEmotion] || emotionToMoodMap['neutral'];
    
    const moodEntry = {
      emoji: moodData.emoji,
      mood: moodData.mood,
      value: moodData.value,
      timestamp: new Date().toISOString(),
      text: `Voice: ${dominantEmotion}`,
      confidence: data.confidence,
      source: 'voice'
    };
    
    setMoodHistory(prevHistory => [...prevHistory, moodEntry]);

    const contextualMessages = {
      'happy': `I can hear the positivity in your voice, ${userName}! 😊 What's making you feel good today?`,
      'sad': `${userName}, I sense some sadness in your tone. I'm here to listen. Want to talk about it? 💙`,
      'angry': `I hear frustration in your voice. Let's work through what's bothering you together.`,
      'frustrated': `Sounds like something's really getting to you. I'm here to help.`,
      'anxious': `Your voice suggests you might be feeling anxious. Would you like to try a breathing exercise? 🧘‍♀️`,
      'fearful': `I hear some worry in your voice. Remember, it's okay to feel scared sometimes. I'm here.`,
      'neutral': `Thanks for sharing, ${userName}. How are things really going?`,
      'positive': `I'm picking up good energy! What's been going well?`,
      'calm': `You sound calm and collected. That's great to hear!`,
      'surprised': `You sound surprised! Want to share what's on your mind?`,
      'disgust': `That sounds really bothering you. Let's talk about it.`
    };
    
    const botMessage = {
      from: 'bot',
      text: contextualMessages[dominantEmotion] || contextualMessages['neutral'],
      timestamp: new Date().toISOString(),
      isVoiceResponse: true,
      emotionDetected: dominantEmotion,
      confidence: data.confidence,
      hasBreathingOption: (dominantEmotion === 'anxious' || dominantEmotion === 'fearful') // Offer breathing for anxiety
    };
    
    setMessages(prev => [...prev, botMessage]);
    setLastVoiceResponseTime(now);

  }, [logAnalytics, lastVoiceResponseTime, userName]);

  // Handle video facial sentiment detection
  const handleVideoSentimentDetected = useCallback((data) => {
    const now = Date.now();

    // Cooldown: Only respond every 5 seconds to avoid spam
    if (now - lastVideoResponseTime < 5000) {
      return;
    }

    logAnalytics('VIDEO_SENTIMENT_DETECTED', {
      emotion: data.emotion,
      confidence: data.confidence
    });

    // Map face-api.js emotions to app moods
    const emotionToMoodMap = {
      'happy': { emoji: '😊', value: 5, mood: 'happy' },
      'sad': { emoji: '😔', value: 2, mood: 'sad' },
      'angry': { emoji: '😡', value: 2, mood: 'frustrated' },
      'fearful': { emoji: '😰', value: 2, mood: 'anxious' },
      'disgusted': { emoji: '😣', value: 2, mood: 'frustrated' },
      'surprised': { emoji: '😲', value: 4, mood: 'neutral' },
      'neutral': { emoji: '😐', value: 3, mood: 'neutral' }
    };

    // Only process if confidence is high enough
    if (data.confidence < 0.65) {
      console.log(`Video emotion ${data.emotion} below confidence threshold.`);
      return;
    }

    const moodData = emotionToMoodMap[data.emotion] || emotionToMoodMap['neutral'];

    const moodEntry = {
      emoji: moodData.emoji,
      mood: moodData.mood,
      value: moodData.value,
      timestamp: new Date().toISOString(),
      text: `Video: ${data.emotion}`,
      confidence: data.confidence,
      source: 'video'
    };

    setMoodHistory(prevHistory => [...prevHistory, moodEntry]);

    const contextualMessages = {
      'happy': `I can see the happiness on your face, ${userName}! 😊 That's wonderful to see!`,
      'sad': `${userName}, I notice you look a bit down. I'm here for you. Want to talk about it? 💙`,
      'angry': `I can see you're feeling frustrated. Let's work through what's bothering you.`,
      'fearful': `I notice some worry on your face. Remember, it's okay to feel anxious. I'm here.`,
      'disgusted': `Something seems to be really bothering you. Let's talk about it.`,
      'surprised': `You look surprised! What's on your mind?`,
      'neutral': `I'm here with you, ${userName}. How are you feeling right now?`
    };

    const botMessage = {
      from: 'bot',
      text: contextualMessages[data.emotion] || contextualMessages['neutral'],
      timestamp: new Date().toISOString(),
      isVideoResponse: true,
      emotionDetected: data.emotion,
      confidence: data.confidence,
      hasBreathingOption: (data.emotion === 'fearful' || data.emotion === 'angry')
    };

    setMessages(prev => [...prev, botMessage]);
    setLastVideoResponseTime(now);

  }, [logAnalytics, lastVideoResponseTime, userName]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(userInput); // Pass userInput explicitly
    }
  }, [handleSend, userInput]); // Add userInput dependency

  const handleNameKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit();
    }
  }, [handleNameSubmit]);

  const handleNameChange = useCallback((e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s\-']*$/.test(value)) {
      setUserName(value);
    }
  }, []);

  const handleVisitPet = useCallback(() => {
    setCurrentPage('pet');
    setUnreadPetNotifications(false);
    logAnalytics('NAVIGATION', { from: 'chat', to: 'pet', moodTrend });
  }, [moodTrend, logAnalytics]);

  // --- RENDER MESSAGE COMPONENT (Memoized for performance) ---
  const MessageComponent = React.memo(({ msg, index }) => {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <div
        key={`${msg.timestamp}-${index}`} // Use a more stable key
        className={`message ${msg.from} ${msg.isError ? 'error' : ''} ${msg.isProactive ? 'proactive' : ''} ${msg.isVoiceResponse ? 'voice-detected' : ''} ${msg.isBreathing ? 'breathing' : ''}`}
        role="article"
      >
        <div className="message-content">
          {msg.text.split('\n').map((line, i) => (
            <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{line}</p>
          ))}
          {msg.hasBreathingOption && !breathingExerciseActive && (
            <button 
              onClick={startBreathingExercise}
              className="breathing-btn"
              aria-label="Start breathing exercise"
            >
              🧘‍♀️ Yes, start breathing exercise
            </button>
          )}
          {msg.emotionDetected && msg.confidence && (
            <span className="emotion-badge">
              Voice: {msg.emotionDetected} ({Math.round(msg.confidence * 100)}%)
            </span>
          )}
        </div>
        <span className="message-timestamp">
          {timestamp}
          {msg.responseTime && <span className="response-time"> • {msg.responseTime}ms</span>}
        </span>
      </div>
    );
  });

  // --- RENDER LOGIC ---
  
  if (showLandingPage) {
    return <LandingPage onStart={handleStartChat} />;
  }

  if (showNameInput) {
    return (
      <div className="App">
        <div className="name-input-screen">
          <div className="name-input-content">
            <h1 className="name-input-title">
              <span className="emoji-pulse">💚</span>
              Mental Wellness Companion
            </h1>
            <p className="name-input-subtitle">
              Welcome! I'm here to support you. What should I call you?
            </p>
            <div className="name-input-container">
              <input
                type="text"
                value={userName}
                onChange={handleNameChange}
                onKeyPress={handleNameKeyPress}
                placeholder="Enter your name..."
                aria-label="Enter your name"
                autoFocus
                maxLength="50"
                className="name-input-field"
              />
              <span className="name-input-count">
                {userName.length}/50
              </span>
            </div>
            <button
              onClick={handleNameSubmit}
              disabled={!userName.trim() || userName.length < 2}
              className="name-input-button"
              aria-label="Start chat"
            >
              <span className="button-icon">💚</span>
              Start Chat
              <span className="button-arrow">→</span>
            </button>
            <p className="name-input-help">
              Press Enter or click the button to begin
            </p>
          </div>
          <div className="name-input-features">
            <div className="feature">
              <span>🔒</span>
              <p>100% Private</p>
            </div>
            <div className="feature">
              <span>♿</span>
              <p>Accessible</p>
            </div>
            <div className="feature">
              <span>24/7</span>
              <p>Always Available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'pet') {
    return (
      <div className="App">
        <PetRoom 
          userName={userName}
          moodHistory={moodHistory}
          onBackToChat={() => {
            setCurrentPage('chat');
            logAnalytics('NAVIGATION', { from: 'pet', to: 'chat' });
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`App font-${fontSize} ${highContrast ? 'high-contrast' : ''}`}
      style={appStyle}
    >
      {/* Video Sentiment - Floating Overlay */}
      {isVideoActive && (
        <VideoSentiment onFaceSentimentDetected={handleVideoSentimentDetected} />
      )}

      <header className="App-header">
        <div className="chat-header">
          <div className="chat-header-content">
            <h1 className="chat-title">
              <span className="title-icon">💚</span>
              Mental Wellness Companion
            </h1>
            <p className="user-greeting">
              Chatting with <strong>{userName}</strong>
              <span className="session-badge">{messageCount} messages</span>
            </p>
          </div>
          
          <div className="chat-header-actions">
            <div className="accessibility-menu">
              <button 
                onClick={() => setFontSize(prev => 
                  prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'
                )}
                aria-label={`Text size: ${fontSize}`}
                title="Text size"
              >
                A{fontSize === 'large' && '+'}{fontSize === 'small' && '-'}
              </button>
              <button 
                onClick={() => setHighContrast(!highContrast)}
                aria-label="High contrast"
                title="High contrast"
              >
                {highContrast ? '🌙' : '☀️'}
              </button>
            </div>

            <button 
              className="header-pet-btn" 
              title="Visit pet" 
              onClick={handleVisitPet}
              aria-label="Visit pet"
            >
              <span role="img" aria-label="pet">🐝</span>
              {unreadPetNotifications && (
                <span className="pet-notification-badge">!</span>
              )}
            </button>
            
            <div className="chat-header-stats">
              <span className="stat-item" title="Session time">
                ⏱️ {getSessionDuration()}
              </span>
              <span className="stat-item" title="Messages">
                💬 {messageCount}
              </span>
              <span 
                className={`stat-item mood-indicator mood-${moodTrend}`}
                title={`Mood: ${moodTrend}`}
              >
                {moodTrend === 'very-positive' && '🌟'}
                {moodTrend === 'positive' && '😊'}
                {moodTrend === 'neutral' && '😐'}
                {moodTrend === 'negative' && '😔'}
              </span>
            </div>
          </div>
        </div>

        {networkStatus === 'offline' && (
          <div className="network-status-offline" role="alert">
            <span>🔌</span>
            <span>You are offline. Messages won't be sent.</span>
          </div>
        )}

        {crisisLevel !== 'none' && (
          <div className="crisis-alert" role="alert" aria-live="assertive">
            <div className="crisis-content">
              <h2 className="crisis-title">
                <span role="img" aria-label="Emergency">🚨</span>
                We Care About Your Safety
              </h2>
              <p className="crisis-text">
                {crisisLevel === 'severe' && "If you're in immediate danger, please reach out now:"}
                {crisisLevel === 'moderate' && "I'm concerned. Please consider reaching out:"}
                {crisisLevel === 'mild' && "Here are some resources that can help:"}
              </p>
              <div className="crisis-resources">
                <a 
                  href="tel:988" 
                  className="crisis-button primary"
                  aria-label="Call 988"
                >
                  📞 Call 988 (Crisis Lifeline)
                </a>
                <a 
                  href="https://988lifeline.org/chat/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="crisis-button secondary"
                >
                  💬 Chat with Counselor
                </a>
                <button 
                  onClick={() => setCrisisLevel('none')}
                  className="crisis-dismiss"
                >
                  I'm Safe - Continue Chat
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="chat-window" ref={chatWindowRef}>
          {/* --- LOGIC FIX: Using MessageComponent --- */}
          {visibleMessages.map((msg, index) => (
            <MessageComponent key={`${msg.timestamp}-${index}`} msg={msg} />
          ))}
          
          {isLoading && (
            <div className="message bot loading-message">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Use MoodTracker component */}
        <MoodTracker 
          history={moodHistory} 
          trend={moodTrend}
        />
        
        {/* --- LOGIC FIX: Always show quick replies --- */}
        <div className="quick-replies-container">
          <div className="quick-replies" role="group" aria-label="Quick emotion responses">
            {QUICK_REPLIES.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                className="quick-reply-btn" // Correct class name
                disabled={isLoading}
                title={reply.text}
              >
                {reply.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* --- LOGIC FIX: Corrected CSS class names --- */}
        <div className="input-area">
          <VoiceSentiment onSentimentDetected={handleSentimentDetected} />

          <button
            onClick={() => setIsVideoActive(!isVideoActive)}
            className="video-toggle-btn"
            aria-label={isVideoActive ? "Stop video" : "Start video"}
            title={isVideoActive ? "Stop video emotion detection" : "Start video emotion detection"}
          >
            {isVideoActive ? '📹' : '📷'}
          </button>

          <textarea
            ref={inputRef}
            value={userInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Tell me how you're feeling..."
            disabled={isLoading || networkStatus === 'offline' || breathingExerciseActive}
            aria-label="Type message"
            maxLength="1000"
            className="message-input" // Correct class name
            rows="1"
          />
          
          <div className="input-addon">
            <span className="char-count" aria-live="polite">
              {userInput.length}/1000
            </span>
            <button
              onClick={() => handleSend(userInput)} // Pass userInput
              disabled={isLoading || !userInput.trim() || networkStatus === 'offline'}
              aria-label="Send"
              className="send-button" // Correct class name
            >
              {isLoading ? '...' : '➤'}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;