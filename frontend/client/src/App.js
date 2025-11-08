import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import LandingPage from './LandingPage';
import MoodTracker from './MoodTracker';
import PetRoom from './PetRoom';
import VoiceSentiment from './VoiceSentiment';

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

  // --- PERFORMANCE: Memoize visible messages ---
  const visibleMessages = useMemo(() => {
    return messages.slice(-50);
  }, [messages]);

  // --- CRISIS DETECTION ---
  const detectCrisisLevel = useCallback((message) => {
    const lowerMessage = message.toLowerCase();
    const severeCrisis = ['suicide', 'kill myself', 'end my life', 'want to die'];
    const moderateCrisis = ['self harm', 'hurt myself', 'no point', 'give up'];
    const mildConcern = ['hopeless', 'worthless', 'can\'t go on', 'too much'];
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
    setBreathingExerciseActive(true);
    const breathingMessage = {
      from: 'bot',
      text: "Let's take a moment to breathe together. 🧘‍♀️\n\nInhale deeply for 4 seconds... Hold for 4... Exhale for 4... Hold for 4.\n\nRepeat this cycle 3 times. I'll wait here for you.",
      timestamp: new Date().toISOString(),
      isBreathing: true
    };
    setMessages(prev => [...prev, breathingMessage]);
    
    // Auto-follow up after 60 seconds
    setTimeout(() => {
      const followUp = {
        from: 'bot',
        text: "How are you feeling now? Sometimes just a minute of breathing can make a difference. 💚",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, followUp]);
      setBreathingExerciseActive(false);
    }, 60000);
  }, []);

  // --- NEW: Detect if user is typing (for better UX) ---
  const handleInputChange = useCallback((e) => {
    setUserInput(e.target.value);
    
    // Show "user is typing" indicator to backend (if needed)
    if (!isTyping) {
      setIsTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // --- PROACTIVE WELLNESS NUDGE (Enhanced) ---
  useEffect(() => {
    if (moodHistory.length >= 3) {
      const recentMoods = moodHistory.slice(-3);
      const allNegative = recentMoods.every(m => m.value <= 2);
      
      if (allNegative && messages.length > 0 && messages[messages.length - 1]?.from !== 'bot') {
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

  const handleSend = useCallback(async (messageText = userInput) => {
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

    // --- NEW: Check for breathing exercise trigger ---
    if (messageText.toLowerCase().includes('breathing') || 
        messageText.toLowerCase().includes('breathe') ||
        messageText.toLowerCase().includes('calm down')) {
      startBreathingExercise();
      setUserInput('');
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

    const userMessage = {
      from: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
      crisisLevel: crisisDetected
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setUserInput('');
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
        responseLength: data.response?.length,
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
  }, [userInput, userName, detectCrisisLevel, moodHistory, messageCount, networkStatus, sessionStartTime, logAnalytics, startBreathingExercise]);

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
    
    // --- NEW: Don't send duplicate message to chat ---
    const acknowledgment = {
      from: 'bot',
      text: `I see you're feeling ${reply.mood}. ${reply.value <= 2 ? "I'm here for you. Want to talk about it?" : "That's good to hear! What's contributing to this feeling?"}`,
      timestamp: new Date().toISOString(),
      isMoodAck: true
    };
    setMessages(prev => [...prev, acknowledgment]);
    
  }, [logAnalytics]);

  const handleSentimentDetected = useCallback((data) => {
    logAnalytics('VOICE_SENTIMENT', data);
    
    const now = Date.now();
    const cooldown = 15000;
    if (now - lastVoiceResponseTime < cooldown) {
      console.log('Voice cooldown active. Ignoring.');
      return;
    }

    const emotionToMoodMap = {
      'happy': { emoji: '😊', value: 5, mood: 'happy' },
      'sad': { emoji: '😔', value: 2, mood: 'sad' },
      'angry': { emoji: '😡', value: 2, mood: 'frustrated' },
      'anxious': { emoji: '😰', value: 3, mood: 'anxious' },
      'positive': { emoji: '😊', value: 4, mood: 'happy' },
      'negative': { emoji: '😔', value: 2, mood: 'sad' },
      'neutral': { emoji: '😐', value: 3, mood: 'neutral' }
    };
    const moodData = emotionToMoodMap[data.emotion] || emotionToMoodMap['neutral'];

    const moodEntry = {
      emoji: moodData.emoji,
      mood: moodData.mood,
      value: moodData.value,
      timestamp: data.timestamp || new Date().toISOString(),
      text: `Voice: ${data.emotion}`,
      confidence: data.confidence,
      source: 'voice'
    };
    setMoodHistory(prevHistory => [...prevHistory, moodEntry]);

    const contextualMessages = {
      'happy': "I can hear the positivity in your voice! What's making you feel good today?",
      'sad': "I sense some sadness in your tone. I'm here to listen. Want to talk about it?",
      'angry': "I hear frustration in your voice. Let's work through what's bothering you.",
      'anxious': "Your voice suggests you might be feeling anxious. Take a deep breath with me.",
      'neutral': "Thanks for sharing. How are things really going?"
    };
    
    const botMessage = {
      from: 'bot',
      text: contextualMessages[data.emotion] || contextualMessages['neutral'],
      timestamp: new Date().toISOString(),
      isVoiceResponse: true
    };
    
    setMessages(prev => [...prev, botMessage]);
    setLastVoiceResponseTime(now);

  }, [logAnalytics, lastVoiceResponseTime]);
  
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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
  const MessageComponent = React.memo(({ msg, index }) => (
    <div
      key={index}
      className={`message ${msg.from} ${msg.isError ? 'error' : ''} ${msg.isProactive ? 'proactive' : ''}`}
      role="article"
      aria-label={`${msg.from === 'user' ? 'You' : 'Bot'} message`}
    >
      <div className="message-content">
        <p>{msg.text}</p>
        {msg.hasBreathingOption && (
          <button 
            onClick={startBreathingExercise}
            className="breathing-btn"
            aria-label="Start breathing exercise"
          >
            🧘‍♀️ Start Breathing Exercise
          </button>
        )}
      </div>
      <span className="message-timestamp">
        {new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
        {msg.responseTime && <span className="response-time"> • {msg.responseTime}ms</span>}
      </span>
    </div>
  ));

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
              aria-label="Start chat with your name"
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
                aria-label={`Change text size. Current: ${fontSize}`}
                title="Text size"
              >
                A{fontSize === 'large' && '+'}{fontSize === 'small' && '-'}
              </button>
              <button 
                onClick={() => setHighContrast(!highContrast)}
                aria-label="Toggle high contrast"
                title="High contrast"
              >
                {highContrast ? '🌙' : '☀️'}
              </button>
            </div>

            <button 
              className="header-pet-btn" 
              title="Visit your buddy" 
              onClick={handleVisitPet}
              aria-label="Visit pet"
            >
              <span role="img" aria-label="pet">🐝</span>
              {unreadPetNotifications && (
                <span className="pet-notification-badge">!</span>
              )}
            </button>
            
            <div className="chat-header-stats">
              <span className="stat-item" title="Session duration">
                ⏱️ {getSessionDuration()}
              </span>
              <span className="stat-item" title="Total messages">
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
                If you're in crisis, please reach out immediately:
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
          {visibleMessages.map((msg, index) => (
            <MessageComponent key={index} msg={msg} index={index} />
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

        {moodHistory.length > 0 && (
          <div className="mood-summary">
            <p>Recent: {moodHistory.slice(-5).map(m => m.emoji).join(' ')}</p>
            <p className="mood-trend-text">Trend: {moodTrend}</p>
          </div>
        )}

        {messages.length <= 3 && (
          <div className="quick-replies">
            {QUICK_REPLIES.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                className="quick-reply-btn"
                disabled={isLoading}
              >
                {reply.emoji}
              </button>
            ))}
          </div>
        )}

        <div className="input-container">
          <VoiceSentiment onSentimentDetected={handleSentimentDetected} />
          
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Tell me how you're feeling..."
            disabled={isLoading || networkStatus === 'offline'}
            aria-label="Type message"
            maxLength="1000"
            className="chat-input"
            rows="1"
          />
          
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !userInput.trim() || networkStatus === 'offline'}
            aria-label="Send"
            className="send-btn"
          >
            {isLoading ? '...' : '➤'}
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
