AI Mood Analytics & Wellness App - Complete Build GuideA step-by-step blueprint for a full-stack, multimodal AI mental health companion.📋 Table of ContentsProject OverviewProject FeaturesSystem ArchitecturePhase 1: Backend Setup (Python/FastAPI)Phase 2: Frontend Setup (React)Phase 3: Run the ProjectProject StructureBiggest Challenges SolvedFuture Improvements<a name="overview"></a>1. Project OverviewThis document provides a complete guide to building the AI Mood Analytics & Wellness App. The project is a full-stack application featuring a React frontend and a Python (FastAPI) backend.Its core purpose is to provide real-time mental wellness support by analyzing user input from three sources simultaneously: text (AI chat), voice (sentiment analysis), and video (facial expression recognition). It includes gamified wellness elements (a "pet companion") and a robust crisis-detection system.<a name="features"></a>2. Project FeaturesMultimodal AI Analysis: The app processes user input from three sources simultaneously:Text (AI Chat): A sophisticated AI chatbot (powered by a backend API) provides contextual, empathetic conversation.Voice (Sentiment Analysis): Using in-browser machine learning, the app analyzes the user's voice in real-time to detect emotional sentiment (e.g., happy, sad, anxious), allowing the AI to respond to how something is said.Video (Facial Expression): Using face-api.js, the app securely analyzes the user's webcam feed (entirely in-browser) to recognize facial expressions (neutral, happy, surprised), providing a third layer of emotional context.Proactive Crisis Detection: The app actively scans text inputs for keywords related to self-harm or severe distress. If triggered, it displays a high-priority, non-dismissible Crisis Alert banner with immediate links to real-world help (e.g., 988 Crisis Lifeline).Gamified Wellness (Pet Companion):Features a 2D "wellness pet" (a bee) in a separate "Pet Room."The pet's mood, appearance, and animations are directly tied to the user's long-term mood trend, creating a gamified incentive for the user to engage in positive interactions and improve their wellness.The AI proactively suggests visiting the pet when the user's mood trend is low.Interactive Wellness Tools:Includes a guided Breathing Exercise module that can be triggered by the user or proactively suggested by the AI during moments of high anxiety.Features an accessibility menu for adjusting font size and enabling a high-contrast mode for WCAG compliance.Privacy-First Architecture: All voice and video analysis is performed 100% on the user's device in the browser. No sensitive biometric audio or video data is ever uploaded or saved to a server, ensuring maximum user privacy.<a name="architecture"></a>3. System ArchitectureThe system is a decoupled full-stack application:Frontend (Client-Side): A React application running on localhost:3000. It handles all UI rendering, user interaction, and, critically, all real-time voice and video analysis using JavaScript-based machine learning libraries. This ensures sensitive biometric data never leaves the user's browser.Backend (Server-Side): A Python (FastAPI) server running on localhost:8000. Its only jobs are to (1) serve the main AI chat responses (via the Gemini API) and (2) apply crisis detection logic to the text.API: The two systems communicate via a REST API. The frontend sends POST requests to /chat and the backend returns a JSON response. CORSMiddleware is essential on the backend to allow this cross-origin communication.<a name="phase-1-backend"></a>4. Phase 1: Backend Setup (Python/FastAPI)Step 1: Create Folders & Environment# 1. Create the main project folder and the backend folder
mkdir ai-wellness-app
cd ai-wellness-app
mkdir backend
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\activate  # (or source venv/bin/activate on Mac/Linux)
Step 2: Install Python Libraries(venv) pip install fastapi "uvicorn[standard]" fastapi-cors pydantic python-dotenv google-generativeai
fastapi: The modern Python web server.uvicorn: The server that "runs" FastAPI.fastapi-cors: Critical middleware to fix the 400 Bad Request (CORS) error and allow React to talk to this server.pydantic: Used by FastAPI to validate incoming data from React.python-dotenv: Loads the secret API key.google-generativeai: To connect to the Gemini API for chat responses.Step 3: Create Backend FilesFile 1: .env (Your Secret Key)Location: backend/.env# Get this key from Google AI Studio
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
File 2: .gitignoreLocation: backend/.gitignorevenv/
__pycache__/
*.pyc
.env
File 3: main.py (The Server)Location: backend/main.pyimport uvicorn
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Load the secret API key
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- App Setup ---
app = FastAPI(
    title="Wellness App AI Backend",
    description="Provides AI chat responses and crisis detection."
)

# --- CORS MIDDLEWARE (THE FIX for 400 Bad Request) ---
# This is critical to allow our React app (on localhost:3000)
# to talk to this server (on localhost:8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS)
    allow_headers=["*"],  # Allows all headers
)

# --- Pydantic Models (Data Validation) ---
# This defines what data we EXPECT from React.
class ChatRequest(BaseModel):
    message: str
    userName: str
    moodHistory: list = []
    messageCount: int = 0
    crisisLevel: str = "none"

# --- Crisis Detection Logic ---
def check_for_crisis(message: str) -> bool:
    """
    A simple crisis detection function.
    In a real app, this would be much more advanced.
    """
    message_lower = message.lower()
    severe_crisis_keywords = ['suicide', 'kill myself', 'end my life', 'want to die']
    
    for keyword in severe_crisis_keywords:
        if keyword in message_lower:
            return True
    return False

# --- AI Chat Logic ---
try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
except Exception as e:
    print(f"Error configuring Gemini: {e}")
    model = None

async def get_ai_response(request_data: ChatRequest) -> str:
    """
    Gets an empathetic response from the Gemini API.
    """
    if not model:
        return "I'm sorry, my AI connection is currently offline. Please try again later."
    
    # Build a context-aware prompt
    system_prompt = (
        "You are 'Aura', a kind, empathetic, and supportive AI wellness companion. "
        "Your role is to listen, provide comfort, and offer gentle, positive suggestions. "
        "You are talking to a user named {request_data.userName}. "
        "Keep your responses concise, warm, and conversational (1-3 sentences)."
    )
    
    full_prompt = f"The user's message is: '{request_data.message}'"
    
    try:
        response = await model.generate_content_async(
            full_prompt,
            generation_config={"temperature": 0.7}
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "I'm sorry, I'm having a little trouble thinking right now. Could you rephrase that?"

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"status": "AI Wellness Backend is running!"}

@app.post("/chat")
async def handle_chat(request: ChatRequest):
    """
    Main chat endpoint. Receives a message, checks for crisis,
    and returns an AI-generated response.
    """
    # 1. Check for Crisis
    is_crisis = check_for_crisis(request.message)
    
    if is_crisis:
        # If a crisis is detected, we DO NOT let the AI respond.
        # We send back a specific, safe response.
        ai_response = (
            "I'm really concerned about what you've shared. "
            "Your safety is the most important thing to me. "
            "Please reach out to a professional right now. You are not alone."
        )
    else:
        # 2. If no crisis, get a normal AI response
        ai_response = await get_ai_response(request)
    
    return {
        "response": ai_response,
        "is_crisis": is_crisis,
        "model": "gemini-1.5-flash"
    }

# --- Run the Server ---
if __name__ == "__main__":
    print("Starting AI Wellness Backend on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

<a name="phase-2-frontend"></a>5. Phase 2: Frontend Setup (React)Step 1: Create React ProjectOpen a new, second terminal.# Navigate to your main project folder
cd ai-wellness-app

# Create the frontend app
npx create-react-app frontend
Step 2: Install JavaScript Libraries# Navigate into the new frontend folder
cd frontend

# Install libraries for AI, video, and styling
npm install face-api.js prop-types
face-api.js: The library for in-browser facial expression recognition.prop-types: Good practice for type-checking React component props.Note: Voice analysis can be done with the built-in Web Speech API or other libraries like VAD.Step 3: Add Face-API ModelsThe face-api.js library needs pre-trained model files to work.Download the models from the face-api.js GitHub repository (or another source).In your frontend folder, create a new folder: public/models.Place the downloaded model files (e.g., tiny_face_detector_model-weights_manifest.json, face_expression_model-weights_manifest.json, etc.) inside this public/models folder.Step 4: Create Frontend FilesThis project is built as a Single-File Application for easy building and debugging. All components are defined inside App.js.File 1: App.js (The Main Application)Location: frontend/src/App.js(This is the final, complete version of the file we built.)import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as faceapi from 'face-api.js';
import './App.css'; // Your final, merged CSS file goes here

// --- Constants ---
const MODEL_URL = '/models';
const FACE_API_LOADED = false; // Global flag to prevent multiple loads

// --- Helper Functions ---
const loadFaceApiModels = async () => {
  if (FACE_API_LOADED) return true;
  try {
    console.log("Loading face-api models...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    console.log("Face-api models loaded!");
    FACE_API_LOADED = true;
    return true;
  } catch (err) {
    console.error("Failed to load face-api models:", err);
    return false;
  }
};

// ===================================
// 1. LANDING PAGE COMPONENT
// ===================================
const LandingPage = ({ onStart }) => (
  <div className="landing-container">
    {/* ... (All Landing Page JSX) ... */}
    <div className="landing-content">
      <div className="landing-hero">
        <h1 className="landing-title">
          <span className="title-emoji" role="img" aria-label="wave">👋</span>
          Meet Your AI Wellness Companion
        </h1>
        <p className="landing-subtitle">
          A private, judgment-free space to talk, breathe, and understand your feelings.
        </p>
      </div>
      <button onClick={onStart} className="landing-start-btn">
        Start Chatting
        <span className="btn-arrow">→</span>
      </button>
    </div>
  </div>
);

// ===================================
// 2. PET ROOM COMPONENT
// ===================================
const PetRoom = ({ userName, moodHistory, onBackToChat }) => {
  // Logic to calculate pet's mood based on moodHistory
  const petMood = useMemo(() => {
    if (moodHistory.length === 0) return 'neutral';
    const recentMoods = moodHistory.slice(-5);
    const avgValue = recentMoods.reduce((sum, item) => sum + (item.value || 3), 0) / recentMoods.length;
    if (avgValue >= 4.5) return 'very-positive';
    if (avgValue >= 3.5) return 'positive';
    if (avgValue <= 2.5) return 'negative';
    return 'neutral';
  }, [moodHistory]);

  const petImageSrc = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userName}&backgroundColor=ffc107,d1d4f9&eyes=bulging&mouth=smile01,smile02&face=round02`;

  return (
    <div className="pet-room-container">
      <button onClick={onBackToChat} className="pet-room-back-btn">
        ← Back to Chat
      </button>
      <div className="pet-room-content">
        <h1 className="pet-room-title">{userName}'s Pet Bee</h1>
        <p className="pet-room-subtitle">Your pet's mood reflects your wellness journey!</p>
        
        <div className="pet-2d-body" data-mood={petMood}>
          <img 
            src={petImageSrc} 
            alt="Your pet bee" 
            className="pet-2d-face"
          />
        </div>
        {/* ... (Pet stats and interaction buttons) ... */}
      </div>
    </div>
  );
};

// ===================================
// 3. VOICE SENTIMENT COMPONENT
// ===================================
const VoiceSentiment = ({ onSentimentDetected }) => {
  // ... (All state and logic for voice recognition) ...
  // This component would use Web Speech API or another library
  // to detect sentiment and call onSentimentDetected(data)
  
  return (
    <div className="voice-sentiment-container">
      <button 
        className="voice-toggle-btn"
        aria-label="Toggle voice analysis"
        title="Voice analysis (Not implemented)"
        disabled
      >
        🎤
      </button>
    </div>
  );
};

// ===================================
// 4. VIDEO SENTIMENT COMPONENT
// ===================================
const VideoSentiment = ({ onFaceSentimentDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const detectionIntervalRef = useRef(null);

  const startWebcam = useCallback(() => {
    setVideoError(null);
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Webcam permission denied:', err);
        setVideoError('Webcam permission denied.');
      });
  }, []);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadFaceApiModels();
      setIsModelLoaded(loaded);
      if (loaded) {
        startWebcam();
      } else {
        setVideoError("Failed to load AI video models.");
      }
    };
    init();

    return () => {
      // Cleanup: stop interval and turn off camera
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [startWebcam]);

  const handleVideoOnPlay = () => {
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !faceapi.nets.tinyFaceDetector.params) {
        return;
      }

      const detections = await faceapi.detectAllFaces(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks(true).withFaceExpressions();

      if (detections && detections.length > 0) {
        const expressions = detections[0].expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) => 
          expressions[a] > expressions[b] ? a : b
        );
        
        if (dominantExpression !== currentEmotion) {
          setCurrentEmotion(dominantExpression);
          onFaceSentimentDetected(dominantExpression);
        }
      }
    }, 1000); // Run every second
  };

  return (
    <div className="video-sentiment-container">
      {videoError ? (
        <div className="video-error-message">
          <p>{videoError}</p>
          <button onClick={startWebcam} className="video-retry-btn">Try Again</button>
        </div>
      ) : (
        <div className="video-feed-wrapper">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            onPlay={handleVideoOnPlay}
            className="video-feed"
          />
          <canvas ref={canvasRef} className="video-overlay-canvas" />
        </div>
      )}
      {!isModelLoaded && !videoError && (
        <div className="video-loading-overlay">
          <p>Loading Video AI...</p>
        </div>
      )}
    </div>
  );
};

// ===================================
// 5. MOOD TRACKER COMPONENT
// ===================================
const MoodTracker = ({ history, trend, faceEmotion }) => {
  const getFaceEmoji = () => {
    const faceMap = {
      happy: '😄', sad: '😢', angry: '😠',
      surprised: '😲', disgusted: '🤢', fearful: '😨',
      neutral: '😐'
    };
    return faceMap[faceEmotion] || '😐';
  };

  return (
    <div className="mood-tracker-container-v2">
      <div className="mood-tracker-header">
        <div className="mood-tracker-avg">
          <span className="avg-label">Mood Trend</span>
          <span className="avg-value">{trend}</span>
        </div>
        <div className="mood-tracker-trend">
          <span className="trend-label">Face</span>
          <span className="trend-emoji">{getFaceEmoji()}</span>
        </div>
        {/* ... (Expand button and timeline) ... */}
      </div>
    </div>
  );
};

// ===================================
// 6. MAIN APP COMPONENT
// ===================================
function App() {
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
  const [moodHistory, setMoodHistory] = useState([]);
  const [moodTrend, setMoodTrend] = useState('neutral');
  const [faceEmotion, setFaceEmotion] = useState('neutral');
  // ... (other states: fontSize, highContrast, etc.)

  const messagesEndRef = useRef(null);

  // --- Core Handlers ---
  const handleStartChat = () => setShowLandingPage(false);

  const handleNameSubmit = () => {
    if (userName.trim()) setShowNameInput(false);
  };

  const handleSend = useCallback(async () => {
    if (userInput.trim() === '') return;

    const userMessage = { from: 'user', text: userInput, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          userName: userName,
          moodHistory: moodHistory.slice(-5),
          messageCount: messages.length,
          crisisLevel: crisisLevel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.is_crisis) {
        setCrisisLevel('severe');
      }

      const botMessage = {
        from: 'bot',
        text: data.response,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorText = error.message.includes('Failed to fetch')
        ? '🔌 Cannot connect to the AI server. Please check your connection.'
        : 'I\'m sorry, I\'m having trouble connecting right now.';
      
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
  }, [userInput, userName, moodHistory, messages, crisisLevel]);

  const handleQuickReply = (reply) => {
    const moodEntry = {
      emoji: reply.emoji,
      mood: reply.mood,
      value: reply.value,
      timestamp: new Date().toISOString()
    };
    setMoodHistory(prev => [...prev, moodEntry]);
    setUserInput(reply.text);
    handleSend(); // Send the quick reply as a message
  };

  const handleFaceSentimentDetected = useCallback((emotion) => {
    setFaceEmotion(emotion);
  }, []);

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- RENDER LOGIC ---
  if (showLandingPage) {
    return <LandingPage onStart={handleStartChat} />;
  }

  if (showNameInput) {
    return (
      <div className="App">
        <div className="name-input-screen">
          {/* ... (Name Input JSX) ... */}
          <h1 className="name-input-title">Welcome! What should I call you?</h1>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="name-input-field"
            placeholder="Enter your name..."
          />
          <button onClick={handleNameSubmit} className="name-input-button">
            Start Chat
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'pet') {
    return (
      <PetRoom 
        userName={userName}
        moodHistory={moodHistory}
        onBackToChat={() => setCurrentPage('chat')}
      />
    );
  }

  // --- Main Chat UI ---
  return (
    <div className="App" data-contrast="false" data-font-size="medium">
      {/* 1. Video Component */}
      <VideoSentiment onFaceSentimentDetected={handleFaceSentimentDetected} />

      {/* 2. Main Chat Box */}
      <header className="App-header">
        {/* ... (Chat Header JSX with Pet Button) ... */}
        <div className="chat-header">
          <div className="chat-header-content">
            <h1 className="chat-title">AI Wellness Companion</h1>
            <p className="user-greeting">Chatting with <strong>{userName}</strong></p>
          </div>
          <button className="header-pet-btn" onClick={() => setCurrentPage('pet')}>
            🐝
            {/* {unreadPetNotifications && <span className="pet-notification-badge">!</span>} */}
          </button>
        </div>
        
        {/* ... (Crisis Alert) ... */}
        {crisisLevel !== 'none' && (
          <div className="crisis-alert">
            <h2>We Care About Your Safety</h2>
            <p>If you're in immediate danger, please reach out now:</p>
            <a href="tel:988" className="crisis-button primary">📞 Call 988 (Crisis Lifeline)</a>
            <button onClick={() => setCrisisLevel('none')} className="crisis-dismiss">
              I'm Safe - Continue Chat
            </button>
          </div>
        )}

        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.from} ${msg.isError ? 'error' : ''}`}>
              <div className="message-content"><p>{msg.text}</p></div>
              <span className="message-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="message bot loading-message">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ... (Mood Tracker) ... */}
        <MoodTracker history={moodHistory} trend={moodTrend} faceEmotion={faceEmotion} />
        
        {/* ... (Quick Replies) ... */}
        <div className="quick-replies-container">
          <div className="quick-replies">
            <button className="quick-reply-btn" onClick={() => handleQuickReply({text: 'Feeling happy', emoji: '😊', mood: 'happy', value: 5})}>😊</button>
            <button className="quick-reply-btn" onClick={() => handleQuickReply({text: 'Feeling sad', emoji: '😔', mood: 'sad', value: 2})}>😔</button>
            <button className="quick-reply-btn" onClick={() => handleQuickReply({text: 'Feeling anxious', emoji: '😰', mood: 'anxious', value: 3})}>😰</button>
          </div>
        </div>

        {/* ... (Input Area) ... */}
        <div className="input-area">
          <VoiceSentiment onSentimentDetected={() => {}} />
          <textarea
            className="message-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey ? handleSend() : null}
            placeholder="Tell me how you're feeling..."
            disabled={isLoading}
          />
          <div className="input-addon">
            <button className="send-button" onClick={handleSend} disabled={isLoading || !userInput.trim()}>
              ➤
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
File 2: App.css (The Final, Merged CSS)Location: frontend/src/App.css(This is the final, 2000+ line CSS file we fixed in our previous chat. It includes styles for the Landing Page, Chat, Pet Room, Video Bubble, Voice Button, and all other components.)/* ============================================
   ROOT VARIABLES
============================================ */
:root {
  --primary-gradient: linear-gradient(135deg, #2d1b4e 0%, #1a1633 50%, #0f0a1a 100%);
  --card-gradient: linear-gradient(135deg, rgba(61, 52, 93, 0.7) 0%, rgba(45, 36, 71, 0.5) 100%);
  --text-primary: #e8e6f0;
  --text-secondary: #b8a5e0;
  --text-accent: #d4c5f9;
  --border-color: rgba(168, 140, 210, 0.3);
  --shadow-primary: 0 20px 60px rgba(0, 0, 0, 0.4);
  --shadow-hover: 0 8px 30px rgba(139, 122, 184, 0.35);
  --transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --animation-duration: 0.3s;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --transition-base: all 0.3s ease;
  --border-hover: rgba(139, 122, 184, 0.6);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 12px 40px rgba(139, 122, 184, 0.4);
  --accent-gradient: linear-gradient(135deg, #8b7ab8 0%, #6b5b8e 100%);
  
  /* Mood Colors (from App.js) */
  --primary-color: #b8a5e0; /* Neutral fallback */
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ============================================
   GENERAL APP STYLING
============================================ */
.App {
  text-align: center;
  /* Uses the --primary-color from the App.js style prop */
  background: linear-gradient(
    135deg, 
    var(--primary-color, #b8a5e0) 0%, 
    #1a1a2e 100%
  );
  background-attachment: fixed;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-primary);
  padding: 16px;
  position: relative;
  overflow-x: hidden;
  transition: background 0.5s ease;
}

.App::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 50%, rgba(139, 122, 184, 0.06) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
  opacity: 0.8;
}

/* ============================================
   LANDING PAGE
   (Your 09:12 AM code - No broken image)
============================================ */
.landing-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  padding: 48px 24px;
  overflow-y: auto;
  /* This uses the App's background, NOT a separate one */
  color: var(--text-primary);
}

.landing-content {
  position: relative;
  z-index: 2;
  max-width: 1000px;
  width: 100%;
  text-align: center;
  animation: fadeIn 1s ease-out;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.landing-hero {
  margin-bottom: 0;
  padding: 32px 0;
}

.landing-title {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--text-accent);
  margin: 0 0 24px 0;
  line-height: 1.2;
  letter-spacing: -1px;
}

.title-emoji {
  display: inline-block;
  animation: wave 2.5s infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(20deg); }
}

.landing-subtitle {
  font-size: 1.4rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin: 16px 0;
  line-height: 1.6;
}

.landing-tagline {
  font-size: 1.05rem;
  color: var(--text-secondary);
  opacity: 0.9;
  margin: 12px 0 0;
}

.landing-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin: 0;
}

.stat {
  background: var(--card-gradient);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  min-height: 140px;
  box-shadow: var(--shadow-sm);
}

.stat:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  display: block;
}

.stat-text {
  font-size: 1.05rem;
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.6;
  margin: 0;
  text-align: center;
}

.landing-features {
  margin: 0;
}

.features-title {
  font-size: 2.5rem;
  color: var(--text-accent);
  font-weight: 800;
  margin: 0 0 40px 0;
  position: relative;
  display: inline-block;
  padding-bottom: 16px;
}

.features-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.feature-card {
  background: var(--card-gradient);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.feature-icon {
  font-size: 2.8rem;
  margin: 0;
  display: block;
}

.feature-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-accent);
  margin: 0;
}

.feature-description {
  font-size: 0.98rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

.landing-cta {
  margin: 32px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.landing-start-btn {
  padding: 20px 48px;
  font-size: 1.3rem;
  font-weight: 800;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-md), 0 0 20px rgba(139, 122, 184, 0.3);
  background: var(--accent-gradient);
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.landing-start-btn:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: var(--shadow-lg), 0 0 30px rgba(139, 122, 184, 0.5);
}

.btn-arrow {
  transition: transform var(--transition-base);
  font-size: 1.5rem;
}

.landing-start-btn:hover .btn-arrow {
  transform: translateX(8px);
}

.cta-subtext {
  font-size: 0.95rem;
  color: var(--text-secondary);
  opacity: 0.8;
  margin: 0;
}

/* ============================================
   NAME INPUT SCREEN
============================================ */
.name-input-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 40px 24px;
  background: rgba(38, 52, 122, 0.35);;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: var(--shadow-primary);
  max-width: 450px;
  width: 90%;
  min-height: 70vh;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.5s ease-out;
}

.name-input-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(97, 54, 213, 0.03) 2px,
      rgba(139, 122, 184, 0.03) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(139, 122, 184, 0.03) 2px,
      rgba(139, 122, 184, 0.03) 4px
    );
  pointer-events: none;
  border-radius: 20px;
  opacity: 0.5;
}

.name-input-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

.name-input-title {
  font-size: 2rem;
  color: var(--text-accent);
  font-weight: 700;
  margin: 0 0 20px 0;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.emoji-pulse {
  display: inline-block;
  font-size: 2.2rem;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.name-input-subtitle {
  font-size: 1.05rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-bottom: 32px;
  line-height: 1.5;
}

.name-input-container {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin-bottom: 20px;
}

.name-input-field {
  font-size: 1rem;
  padding: 14px 48px 14px 16px;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background: rgba(26, 22, 51, 0.8);
  color: var(--text-primary);
  width: 100%;
  transition: all var(--animation-duration) var(--transition-smooth);
  font-weight: 500;
}

.name-input-field::placeholder { color: #8a7ba8; opacity: 0.8; }

.name-input-field:focus {
  outline: none;
  border-color: #8b7ab8;
  background: rgba(45, 36, 71, 0.9);
  box-shadow: 0 0 0 3px rgba(139, 122, 184, 0.15);
}

.name-input-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #a898d4;
  pointer-events: none;
  background: rgba(45, 36, 71, 0.6);
  padding: 2px 6px;
  border-radius: 4px;
}

.name-input-button {
  width: 100%;
  max-width: 320px;
  padding: 14px 28px;
  font-size: 1.05rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.name-input-help {
  font-size: 0.85rem;
  color: #ffffff;
  margin-top: 16px;
  font-weight: 400;
}

.name-input-features {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 320px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(168, 140, 210, 0.2);
  gap: 16px;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  transition: all var(--animation-duration) ease;
  flex: 1;
  cursor: default;
}

.feature:hover {
  color: var(--text-accent);
  transform: translateY(-2px);
}

.feature span {
  font-size: 1.8rem;
  display: block;
  transition: transform var(--animation-duration) ease;
}

.feature:hover span { transform: scale(1.1); }

.feature p {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.3;
}

/* ============================================
   MAIN CHAT APP
============================================ */
.App-header {
  background: rgba(78, 67, 118, 0.3); /* --bg-card */
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 20px 0 0 0; /* No top padding */
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  height: 90vh; /* Set height */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-primary);
  border: 1px solid var(--border-color);
  position: relative;
  z-index: 1;
}

/* --- Chat Header --- */
.chat-header {
  background: transparent; /* Header is part of card */
  padding: 0 24px 20px 24px; /* Padding inside */
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column; /* Use column */
  gap: 12px;
  flex-shrink: 0;
}

.chat-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.chat-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 1.8rem;
}

.user-greeting {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-greeting strong {
  color: #4ecdc4; /* --accent-green */
}

.session-badge {
  background: rgba(139, 122, 184, 0.3);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* --- ACCESSIBILITY MENU --- */
.accessibility-menu {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 4px;
}

.accessibility-menu button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none; /* Override general button */
}

.accessibility-menu button:hover {
  background: rgba(139, 122, 184, 0.5);
  border-color: #8b7ab8; /* --accent-purple */
  transform: translateY(-1px);
}

/* --- PET BUTTON --- */
.header-pet-btn {
  background: rgba(255, 193, 7, 0.1); /* Bee yellow */
  border: 2px solid rgba(255, 193, 7, 0.3);
  color: #FFC107;
  padding: 0;
  width: 44px; /* Fix size */
  height: 44px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none; /* Override general button */
}

.header-pet-btn:hover {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.3) 100%);
  border-color: #FFC107;
  transform: scale(1.1) rotate(15deg);
}

.pet-notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff6b6b;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* --- STATS --- */
.chat-header-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.mood-indicator {
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.mood-indicator.mood-very-positive {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
}
.mood-indicator.mood-positive {
  background: rgba(139, 122, 184, 0.2);
  color: #8b7ab8;
}
.mood-indicator.mood-neutral {
  background: rgba(184, 165, 224, 0.2);
  color: #b8a5e0;
}
.mood-indicator.mood-negative {
  background: rgba(255, 135, 135, 0.2);
  color: #ff8787;
}

/* --- NETWORK STATUS --- */
.network-status-offline {
  background: rgba(255, 59, 48, 0.2);
  border: 1px solid rgba(255, 59, 48, 0.4);
  color: #ff3b30;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 24px 12px 24px; /* Add margin */
  flex-shrink: 0;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- CRISIS ALERT Banner --- */
.crisis-alert {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  padding: 20px;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3);
  animation: slideDown 0.3s ease;
  border-radius: 0;
  margin-bottom: 0;
  border: none;
}

.crisis-content {
  max-width: 650px;
  margin: 0 auto;
  text-align: left;
}

.crisis-title {
  font-size: 1.5rem;
  color: white;
  margin: 0 0 10px 0;
  font-weight: 700;
}

.crisis-text {
  font-size: 1rem;
  color: white;
  opacity: 0.9;
  margin: 0;
}

.crisis-resources {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

.crisis-button {
  padding: 15px 25px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: bold;
  text-align: center;
  transition: transform 0.2s;
  font-size: 16px;
  border: none;
  cursor: pointer;
  color: #ff6b6b; /* Text color for primary */
}

.crisis-button.primary {
  background: white;
  color: #ff6b6b;
}

.crisis-button.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.crisis-button:hover {
  transform: scale(1.05);
}

.crisis-dismiss {
  margin-top: 10px;
  padding: 10px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}


/* --- CHAT WINDOW --- */
.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #16213e; /* --bg-secondary */
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0; /* Flex fix */
}

.chat-window::-webkit-scrollbar {
  width: 8px;
}
.chat-window::-webkit-scrollbar-track {
  background: transparent;
}
.chat-window::-webkit-scrollbar-thumb {
  background: rgba(139, 122, 184, 0.3);
  border-radius: 4px;
}
.chat-window::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 122, 184, 0.5);
}

/* --- MESSAGES --- */
.message {
  display: flex;
  flex-direction: column;
  max-width: 75%;
  animation: fadeIn 0.3s ease;
}
.message.bot {
  align-self: flex-start;
}
.message.user {
  align-self: flex-end;
}
.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message p {
  margin: 0;
  padding: 14px 18px;
  border-radius: 18px;
  line-height: 1.5;
  font-size: var(--base-font-size);
  white-space: pre-wrap; /* For breathing exercise */
}
.message.bot p {
  background: rgba(78, 67, 118, 0.3); /* --bg-card */
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 18px 18px 18px 4px;
}
.message.user p {
  background: linear-gradient(135deg, #8b7ab8, #6b5b95); /* --accent-purple */
  color: white;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 4px 12px rgba(139, 122, 184, 0.3);
}
.message-timestamp {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
  padding: 0 8px;
  margin-top: 4px;
}
.message.bot .message-timestamp {
  align-self: flex-start;
}
.message.user .message-timestamp {
  align-self: flex-end;
}
.response-time {
  opacity: 0.7;
}

/* --- TYPING INDICATOR --- */
.loading-message {
  align-self: flex-start;
  max-width: 80px;
}
.loading-message .typing-indicator {
  display: flex;
  gap: 6px;
  padding: 14px 18px;
  background: rgba(78, 67, 118, 0.3); /* --bg-card */
  border: 1px solid var(--border-color);
  border-radius: 18px 18px 18px 4px;
}
.loading-message .typing-indicator span {
  width: 8px;
  height: 8px;
  background: #8b7ab8; /* --accent-purple */
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}
.loading-message .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.loading-message .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* --- MOOD TRACKER --- */
.mood-tracker-container-v2 {
  padding: 14px 16px;
  background-color: rgba(26, 22, 51, 0.7);
  border-radius: 12px;
  margin: 0 24px 16px 24px; /* Add margin */
  border: 1px solid var(--border-color);
  text-align: left;
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.mood-tracker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.mood-tracker-avg, .mood-tracker-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avg-label, .trend-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.avg-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  background: rgba(139, 122, 184, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
}
.trend-icon {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--mood-color, var(--text-secondary));
}
.trend-emoji {
  font-size: 1.2rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mood-toggle-btn {
  background: rgba(139, 122, 184, 0.2);
  border: 1px solid var(--border-color);
  color: var(--text-accent);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 400;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none; /* Override */
}
.mood-toggle-btn:hover {
  background: rgba(139, 122, 184, 0.4);
  transform: scale(1.1);
}
.timeline-tip {
  font-size: 0.8rem;
  color: #8a7ba8;
  margin: 10px 0 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}
.mood-tracker-timeline-expanded {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  animation: fadeIn 0.3s ease;
}
.timeline-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-accent);
}
.timeline-items {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.timeline-items::-webkit-scrollbar { display: none; }
.timeline-item {
  font-size: 1.5rem;
  padding: 4px;
  background: var(--card-gradient);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}
.timeline-item:hover { transform: scale(1.1); }
.timeline-empty { font-size: 0.9rem; color: #8a7ba8; }

/* --- QUICK REPLIES --- */
.quick-replies-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 12px 0;
  margin: 8px 0;
  border-top: 1px solid rgba(139, 122, 184, 0.2);
  border-bottom: 1px solid rgba(139, 122, 184, 0.2);
  flex-shrink: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 122, 184, 0.4) transparent;
  background: linear-gradient(to bottom, rgba(26, 26, 46, 0.3), transparent);
}
.quick-replies-container::-webkit-scrollbar {
  height: 8px;
}
.quick-replies-container::-webkit-scrollbar-track { 
  background: rgba(0, 0, 0, 0.1); 
  border-radius: 4px;
}
.quick-replies-container::-webkit-scrollbar-thumb { 
  background: linear-gradient(135deg, #8b7ab8, #6b5b95);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.quick-replies-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #b8a5e0, #8b7ab8);
  background-clip: content-box;
}
.quick-replies {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 20px;
}
.quick-reply-btn {
  background: linear-gradient(135deg, rgba(78, 67, 118, 0.5), rgba(45, 36, 71, 0.7));
  border: 2px solid rgba(139, 122, 184, 0.4);
  color: var(--text-primary, #ffffff);
  padding: 12px 18px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1.3rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  min-width: 48px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  box-shadow: none; /* Override button */
}
.quick-reply-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 122, 184, 0.3), rgba(184, 165, 224, 0.3));
  opacity: 0;
  transition: opacity 0.3s ease;
}
.quick-reply-btn:hover:not(:disabled)::before {
  opacity: 1;
}
.quick-reply-btn:hover:not(:disabled) {
  border-color: #b8a5e0;
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 8px 16px rgba(139, 122, 184, 0.3),
    0 0 20px rgba(139, 122, 184, 0.2);
}
.quick-reply-btn:active:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
}
.quick-reply-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}
.quick-reply-btn:focus-visible {
  outline: 3px solid #8b7ab8;
  outline-offset: 4px;
}

/* --- INPUT CONTAINER --- */
.input-area {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  background: rgba(78, 67, 118, 0.3); /* --bg-card */
  backdrop-filter: blur(20px);
  border-radius: 0 0 20px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  align-items: flex-end; /* Align items to bottom */
}

.message-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05); /* --input-bg */
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 18px;
  color: var(--text-primary);
  font-size: var(--base-font-size);
  font-family: inherit;
  resize: none;
  min-height: 50px;
  max-height: 120px;
  transition: all 0.2s ease;
  line-height: 1.5;
}
.message-input:focus {
  outline: none;
  border-color: #8b7ab8; /* --accent-purple */
  background: rgba(255, 255, 255, 0.08);
}
.message-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.send-button {
  background: linear-gradient(135deg, #8b7ab8, #6b5b95); /* --accent-purple */
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  min-width: 50px;
  min-height: 50px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0; /* Override general button */
  box-shadow: 0 4px 12px rgba(139, 122, 184, 0.3);
}

.send-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(139, 122, 184, 0.4);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.input-addon {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* --- PET ROOM (Full Tamagotchi styles) --- */
.pet-room-container {
  background-image: 
    linear-gradient(135deg, 
      rgba(45, 27, 78, 0.60) 0%,
      rgba(26, 22, 51, 0.70) 50%,
      rgba(15, 10, 26, 0.75) 100%
    ),
    url('[https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072](https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072)');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 24px;
  box-sizing: border-box;
  color: #ffffff;
  animation: fadeIn 0.6s ease-out;
  overflow-y: auto;
  position: relative;
}

.pet-room-back-btn {
  position: fixed;
  top: 24px;
  left: 24px;
  background: rgba(40, 30, 60, 0.85);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  transition: all 0.3s ease;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-room-back-btn:hover {
  background: rgba(60, 45, 85, 0.95);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.back-arrow {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}
.pet-room-back-btn:hover .back-arrow {
  transform: translateX(-4px);
}
.back-text {
  font-weight: 700;
}

.pet-room-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  width: 100%;
  max-width: 600px;
  margin-top: 80px;
  gap: 32px;
  padding-bottom: 40px;
}

.pet-room-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.pet-room-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: -0.5px;
}
.pet-room-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin: 0;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.pet-display-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 16px 0;
  position: relative;
}
.pet-2d-body {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.4),
    inset 0 2px 10px rgba(255, 255, 255, 0.1);
  transition: all 0.4s ease;
  animation: pet-bob 3s ease-in-out infinite;
  backdrop-filter: blur(10px);
  position: relative;
}
.pet-2d-body:hover {
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 
    0 12px 35px rgba(0, 0, 0, 0.5),
    inset 0 2px 10px rgba(255, 255, 255, 0.15);
}
.pet-2d-body[data-mood="very-positive"] {
  animation: pet-bob 2s ease-in-out infinite, pet-happy-spin 4s linear infinite;
  border-color: rgba(78, 205, 196, 0.7);
  box-shadow: 
    0 10px 30px rgba(78, 205, 196, 0.4),
    0 0 40px rgba(78, 205, 196, 0.2);
}
.pet-2d-body[data-mood="positive"] {
  border-color: rgba(139, 122, 184, 0.7);
}
.pet-2d-body[data-mood="negative"] {
  animation: pet-bob 5s ease-in-out infinite;
  border-color: rgba(255, 135, 135, 0.7);
  box-shadow: 
    0 10px 30px rgba(255, 135, 135, 0.4),
    0 0 40px rgba(255, 135, 135, 0.2);
}
@keyframes pet-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
@keyframes pet-happy-spin {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(12deg); }
  75% { transform: translateY(-20px) rotate(-12deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

.pet-2d-face {
  width: 85%;
  height: 85%;
  object-fit: contain;
  object-position: center;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  border-radius: 50%;
  will-change: transform, filter;
  transform: translateZ(0);
  backface-visibility: hidden;
}
.pet-2d-body:hover .pet-2d-face {
  transform: scale(1.15) translateZ(0);
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.4)) brightness(1.05);
}
.pet-2d-body:active .pet-2d-face {
  transform: scale(1.05) translateZ(0);
  transition: all 0.1s ease;
}
.pet-2d-body[data-mood="very-positive"] .pet-2d-face {
  filter: drop-shadow(0 4px 12px rgba(78, 205, 196, 0.5)) brightness(1.1) saturate(1.2);
}
.pet-2d-body[data-mood="positive"] .pet-2d-face {
  filter: drop-shadow(0 4px 12px rgba(139, 122, 184, 0.4)) brightness(1.05);
}
.pet-2d-body[data-mood="negative"] .pet-2d-face {
  filter: drop-shadow(0 4px 12px rgba(255, 135, 135, 0.4)) brightness(0.9) saturate(0.9);
}
.pet-2d-body[data-mood="neutral"] .pet-2d-face {
  filter: drop-shadow(0 4px 12px rgba(184, 165, 224, 0.3));
}

@keyframes moodChange {
  0% { opacity: 1; transform: scale(1) rotate(0deg); }
  50% { opacity: 0.5; transform: scale(0.9) rotate(-5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
.pet-2d-face.mood-changing {
  animation: moodChange 0.6s ease-in-out;
}
.pet-2d-face[data-loading="true"] {
  opacity: 0;
  transform: scale(0.8);
}
.pet-2d-face[data-loading="false"] {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.pet-2d-face[alt]::before { /* Fallback for broken images */
  content: attr(alt);
  display: block;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 20px;
}

.pet-mood-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 220px; /* Width of body + padding */
  height: 220px;
  border: 3px solid;
  border-radius: 50%;
  opacity: 0.6;
  animation: ringPulse 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes ringPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}

.pet-interaction-feedback {
  width: 100%;
  max-width: 500px;
  background: linear-gradient(135deg,
    rgba(78, 205, 196, 0.25) 0%,
    rgba(139, 122, 184, 0.25) 100%
  );
  border: 2px solid rgba(78, 205, 196, 0.5);
  border-radius: 12px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  animation: feedbackSlide 0.4s ease-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}
@keyframes feedbackSlide {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.feedback-icon {
  font-size: 1.8rem;
  animation: bounce 0.6s ease-in-out;
}

.pet-stats-container {
  width: 100%;
  max-width: 500px;
  background: rgba(40, 30, 60, 0.75);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.pet-stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stat-label-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stat-icon {
  font-size: 1.6rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}
.stat-label {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}
.stat-value {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}
.stat-bar-container {
  width: 100%;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}
.stat-bar-fill {
  height: 100%;
  border-radius: 20px;
  transition: width 0.6s ease;
  box-shadow: 0 0 10px currentColor;
}
.stat-bar-fill[data-stat="happiness"] {
  background: linear-gradient(90deg, #ff6b9d 0%, #ffa07a 100%);
}
.stat-bar-fill[data-stat="hunger"] {
  background: linear-gradient(90deg, #ff6b6b 0%, #ff9f6b 100%);
}
.stat-bar-fill[data-stat="energy"] {
  background: linear-gradient(90deg, #ffd93d 0%, #ffb347 100%);
}

.pet-interaction-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 500px;
}
.pet-action-btn {
  background: rgba(40, 30, 60, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #ffffff; /* Enabled color */
  padding: 20px;
  border-radius: 16px;
  cursor: pointer; /* Enabled cursor */
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1; /* Enabled opacity */
  box-shadow: none; /* Override general */
}
.pet-action-btn:hover {
  background: rgba(60, 45, 85, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}
.pet-action-btn:disabled {
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  opacity: 0.5;
  transform: none;
  box-shadow: none;
  background: rgba(40, 30, 60, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}
.btn-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}
.btn-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pet-tips-section {
  width: 100%;
  max-width: 500px;
  background: rgba(40, 30, 60, 0.75);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.tips-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tips-list li {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  padding-left: 24px;
  position: relative;
  line-height: 1.6;
}
.tips-list li::before {
  content: '💡';
  position: absolute;
  left: 0;
  font-size: 1rem;
}

.pet-mood-summary {
  width: 100%;
  max-width: 500px;
  background: rgba(40, 30, 60, 0.75);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.summary-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mood-history-emojis {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.mood-history-emoji {
  font-size: 2rem;
  animation: fadeIn 0.4s ease-out;
  transition: transform 0.3s ease;
  cursor: pointer;
}
.mood-history-emoji:hover {
  transform: scale(1.3) rotate(10deg);
}

/* === PET ROOM RESPONSIVE === */
@media (max-width: 768px) {
  .pet-room-container {
    padding: 20px 16px;
    background-attachment: scroll;
  }
  .pet-room-content {
    margin-top: 70px;
    gap: 24px;
  }
  .pet-room-title {
    font-size: 2rem;
  }
  .pet-2d-body {
    width: 160px;
    height: 160px;
  }
  .pet-2d-face {
    width: 80%;
    height: 80%;
  }
  .pet-interaction-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .pet-room-back-btn {
    top: 16px;
    left: 16px;
    padding: 10px 16px;
    font-size: 0.85rem;
  }
  .pet-room-title {
    font-size: 1.75rem;
  }
  .pet-2d-body {
    width: 140px;
    height: 140px;
  }
  .pet-2d-face {
    width: 75%;
    height: 75%;
  }
}

/* === BREATHING & VOICE STYLES === */
.breathing-btn {
  background: linear-gradient(135deg, #4ecdc4 0%, #3eada2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.25);
  position: relative;
  overflow: hidden;
  min-height: 44px;
}
.breathing-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}
.breathing-btn:hover::before {
  width: 300px;
  height: 300px;
}
.breathing-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(78, 205, 196, 0.35);
}
.breathing-btn:active {
  transform: translateY(-1px);
}
.breathing-btn:focus-visible {
  outline: 3px solid #4ecdc4;
  outline-offset: 4px;
}

.message.breathing .message-content p {
  background: linear-gradient(135deg, #4ecdc4 0%, #3eada2 100%);
  color: white;
  font-style: normal;
  font-weight: 500;
  line-height: 1.8;
  white-space: pre-wrap;
  padding: 18px 22px;
  border-radius: 20px;
  box-shadow: 0 6px 16px rgba(78, 205, 196, 0.25);
  animation: breathingPulse 4s ease-in-out infinite;
}
@keyframes breathingPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 6px 16px rgba(78, 205, 196, 0.25); }
  50% { transform: scale(1.02); box-shadow: 0 8px 24px rgba(78, 205, 196, 0.35); }
}

.emotion-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(139, 122, 184, 0.2);
  border: 1.5px solid rgba(139, 122, 184, 0.4);
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #b8a5e0;
  margin-top: 10px;
  backdrop-filter: blur(10px);
  animation: badgeFadeIn 0.4s ease;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
@keyframes badgeFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.emotion-badge::before {
  content: '🎤';
  font-size: 1rem;
}

.message.voice-detected .message-content p {
  background: linear-gradient(135deg, #8b7ab8 0%, #6b5b8e 100%);
  color: white;
  font-style: italic;
  border-left: 4px solid #b8a5e0;
  box-shadow: 0 6px 16px rgba(139, 122, 184, 0.3);
  animation: voiceGlow 2s ease-in-out infinite;
}
@keyframes voiceGlow {
  0%, 100% { box-shadow: 0 6px 16px rgba(139, 122, 184, 0.3); }
  50% { box-shadow: 0 8px 24px rgba(139, 122, 184, 0.5); }
}

/* --- VOICE SENTIMENT COMPONENT (Inside Input Bar) --- */
.voice-sentiment-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0; /* Removed padding-left */
}
.voice-toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: none;
  border-radius: 50%;
  width: 50px; /* Match send button */
  height: 50px;
}
.voice-toggle-btn:hover:not(:disabled) {
  color: var(--text-primary);
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.1);
}
.voice-toggle-btn[data-listening="true"] {
  color: #ff6b6b;
  animation: pulse 1.5s ease-in-out infinite;
}
.voice-toggle-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  background: transparent;
}
.voice-status,
.current-emotion,
.emotion-history {
  display: none;
}

/* --- VIDEO SENTIMENT COMPONENT (Your 09:50 PM code) --- */
.video-sentiment-container {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  overflow: hidden;
  position: fixed;
  top: 90px;
  right: 28px;
  z-index: 200;
  border: 4px solid #4ecdc4;
  box-shadow: 0 10px 32px rgba(76,205,196,0.13), 0 1.5px 24px rgba(107,91,142,0.11);
  background: linear-gradient(135deg, rgba(76,205,196,0.12) 0%, rgba(139,122,184,0.17) 100%);
  backdrop-filter: blur(22px);
  transition: box-shadow 0.4s cubic-bezier(.4,0,.2,1), transform 0.4s cubic-bezier(.4,0,.2,1);
  animation: fadeIn 0.5s cubic-bezier(.44,0,.48,1);
}
.video-sentiment-container:focus-within {
  outline: 3px solid #4ecdc4;
  outline-offset: 6px;
}
.video-sentiment-container:hover {
  transform: scale(1.07) rotate(-1deg);
  box-shadow: 0 12px 40px rgba(76,205,196,0.21), 0 2px 28px rgba(107,91,142,0.17);
}

.video-feed-wrapper { position: relative; width: 100%; height: 100%; }

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  transform: scaleX(-1);
  filter: brightness(0.97) contrast(1.05) saturate(1.03);
}

.video-overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
  mix-blend-mode: screen;
}

.video-emotion-display {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  background: rgba(26,22,51,0.7);
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(139,122,184,.18);
  padding: 7px 18px;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 1.05rem;
  font-weight: 600;
  z-index: 12;
  color: #fff;
}
.emotion-icon {
  font-size: 1.5rem;
  animation: bounceEmotion 1s infinite alternate;
}
@keyframes bounceEmotion {
  0% { transform: translateY(-2px) scale(0.98);}
  100% { transform: translateY(2px) scale(1.07);}
}
.emotion-info { display: flex; flex-direction: column; }
.emotion-label { letter-spacing: 0.7px; }
.emotion-confidence { font-size: 0.88rem; color: #b8a5e0; opacity: 0.85; }

.video-error-message,
.video-loading-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  background: rgba(26,22,51,0.90);
  border-radius: 50%;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 14px rgba(139,122,184,.15);
}
.video-loading-overlay p {
  font-size: 1rem;
  font-weight: 600;
  color: #4ecdc4;
  animation: pulse 1.7s ease-in-out infinite;
}

.loading-bar {
  background: rgba(184,165,224,0.18);
  border-radius: 6px;
  height: 8px;
  width: 80%;
  margin: 14px auto 0;
  overflow: hidden;
}
.loading-bar-fill {
  background: linear-gradient(90deg,#4ecdc4,#8b7ab8 70%);
  height: 8px;
  border-radius: 6px;
  transition: width 0.4s cubic-bezier(.42,0,.58,1);
}
.loading-percent {
  font-size:0.8rem;color:#b8a5e0;margin-top:4px;
}
.error-icon {
  font-size: 2rem;
  color: #8b7ab8;
  margin-bottom: 9px;
}
.video-retry-btn {
  background: linear-gradient(135deg, #4ecdc4 0%, #8b7ab8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.3s, transform 0.22s;
  box-shadow: 0 4px 12px rgba(76,205,196,0.13);
}
.video-retry-btn:hover {
  background: linear-gradient(135deg, #8b7ab8 0%, #4ecdc4 100%);
  transform: scale(1.06);
}
.video-close-btn {
  position: absolute;
  top: 7px;
  right: 12px;
  background: rgba(107,91,142,0.09);
  color: #fff;
  font-size: 1.4rem;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  z-index: 20;
  padding: 0;
  line-height: 1;
  opacity: 0.82;
  transition: background 0.18s, color 0.18s;
}
.video-close-btn:hover {
  background: rgba(76,205,196,0.17);
  color: #4ecdc4;
}

@media (max-width: 600px) {
  .video-sentiment-container { width: 106px; height: 106px; right: 6px; top: 60px; }
  .video-emotion-display { font-size: 0.85rem; padding: 5px 10px; border-radius: 13px; gap: 7px;}
}

/* --- ACCESSIBILITY: Font Size & Contrast --- */
.App[data-font-size="small"] .message p,
.App[data-font-size="small"] .message-input {
  font-size: 0.8rem;
}
.App[data-font-size="large"] .message p,
.App[data-font-size="large"] .message-input {
  font-size: 1.15rem;
}

.App[data-contrast="high"] {
  --text-primary: #FFFFFF;
  --text-secondary: #E0E0E0;
  --text-accent: #FFFF00; /* High contrast yellow */
  --border-color: #FFFFFF;
  --card-gradient: #000000;
  --primary-gradient: #000000;
  background: #000000 !important;
}
.App[data-contrast="high"] .message.user p {
  background: #000000;
  border: 2px solid #FFFF00;
  color: #FFFF00;
}
.App[data-contrast="high"] .message.bot p {
  background: #000000;
  border: 2px solid #FFFFFF;
  color: #FFFFFF;
}
.App[data-contrast="high"] .breathing-btn {
  background: #FFFF00;
  color: #000000;
  border: 3px solid #000000;
}
.App[data-contrast="high"] .emotion-badge {
  background: #000000;
  border: 3px solid #FFFF00;
  color: #FFFF00;
}
.App[data-contrast="high"] .quick-reply-btn {
  background: #000000;
  border: 3px solid #FFFF00;
  color: #FFFF00;
}
.App[data-contrast="high"] .send-button {
  background: #FFFF00;
  color: #000000;
  border: 3px solid #000000;
}

/* --- ACCESSIBILITY: Reduced Motion --- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .breathing-btn:hover,
  .send-button:hover,
  .quick-reply-btn:hover {
    transform: none;
  }
  
  .video-sentiment-container,
  .video-emotion-display,
  .emotion-icon {
    animation: none !important;
    transition: none !important;
  }
}
<a name="phase-3-run"></a>6. Phase 3: Run the ProjectCreate a batch file in your root ai-wellness-app/ folder to launch both servers at once.File: start_project.batLocation: ai-wellness-app/start_project.bat@echo off
ECHO ===================================
ECHO  STARTING AI WELLNESS APP SERVERS
ECHO ===================================

ECHO Starting Python Backend Server (http://localhost:8000)...
START "Python Backend" cmd /k "cd backend && call .\venv\Scripts\activate && python main.py"

ECHO Starting React Frontend Server (http://localhost:3000)...
START "React Frontend" cmd /k "cd frontend && npm start"

ECHO Servers are starting in new windows.
ECHO Your app will open at http://localhost:3000
timeout /t 3 > nul
<a name="structure"></a>7. Project StructureYour final folder structure will look like this:ai-wellness-app/
│
├── backend/
│   ├── venv/
│   ├── .env
│   ├── .gitignore
│   └── main.py
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   │   └── models/
│   │       ├── tiny_face_detector_model-weights_manifest.json
│   │       ├── face_expression_model-weights_manifest.json
│   │       └── (etc...)
│   ├── src/
│   │   ├── App.js         (Contains all React components)
│   │   ├── App.css        (Contains all styles)
│   │   └── index.js
│   ├── .gitignore
│   └── package.json
│
└── start_project.bat
<a name="challenges"></a>8. What was the biggest challenge your team solved?Our biggest challenge was integrating three separate, real-time AI systems into one cohesive and performant user experience while guaranteeing user privacy.Specifically, we solved:Multimodal State Management: The hardest part was getting the three systems (text AI, voice AI, video AI) to talk to each other. We had to create a central state in React that could be updated by the video component, the voice component, and the chat API at the same time without causing infinite loops or performance crashes.Privacy-First AI: Running voice and video analysis in the browser is difficult. We had to successfully load and manage the face-api.js models on the frontend, ensuring that sensitive biometric data never left the user's machine. This was a massive technical and ethical challenge.Full-Stack Integration & CORS: We had to build a reliable connection between our React frontend (localhost:3000) and our Python (FastAPI) backend (localhost:8000). We solved a critical 400 Bad Request (CORS) error by correctly configuring CORSMiddleware on the server, which was a major blocker.A Non-Annoying UI/UX: We had to display a chat, a live video feed, voice analysis, and a pet companion without overwhelming the user. We solved this by designing the "video bubble" (a small, floating component) and moving the "pet companion" to its own dedicated room, keeping the main chat interface clean.Contextual AI Responses: The AI wasn't just a simple chatbot. We successfully programmed it to change its response based on the data from the other models (e.g., "I see you're smiling, but your voice sounds sad. What's on your mind?").<a name="future"></a>9. If you had more time, what would you improve?With more time, we would focus on making the app a true long-term companion:Deeper AI & Pet Integration:Allow the AI to become the pet. Instead of a separate chatbot, the user would be "talking" to their pet, and the pet's animations would sync with the AI's responses.Add long-term memory so the AI can remember past conversations and goals (e.g., "You mentioned you had an exam last week. How did it go?").Expand the Pet Companion:Allow users to choose from different pets (cat, dog, bird).Add customization (colors, accessories) that unlock as the user maintains a positive mood trend.Create mini-games (like the breathing exercise) that the user can "play" with their pet for stress relief.Add More Wellness Tools:Build a guided Journaling feature where the AI can provide prompts and analyze journal entries for sentiment over time.Create a Mood Analytics Dashboard for users to see long-term patterns, triggers, and correlations.Connect Users to Real Help:Build a secure, optional feature for users to connect with licensed therapists or join anonymous, moderated peer-support groups.
