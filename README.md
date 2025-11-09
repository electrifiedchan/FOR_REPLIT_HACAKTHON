# 💚 AI Mental Wellness Companion

An intelligent, accessible mental health support application that combines AI-powered conversational therapy with multimodal emotion detection, gamification, and comprehensive accessibility features.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![Python](https://img.shields.io/badge/Python-3.8+-3776ab)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Overview

The **AI Mental Wellness Companion** is a comprehensive mental health support platform that provides:
- 🤖 **AI-Powered Conversations** using Google's Gemini 2.5 Flash model
- 🎤 **Voice Emotion Detection** with real-time sentiment analysis
- 📹 **Video Emotion Recognition** using facial expression analysis
- 🐝 **Virtual Pet Companion** that responds to your emotional state
- 📊 **Mood Tracking & Analytics** with trend visualization
- 🧘‍♀️ **Guided Breathing Exercises** for anxiety relief
- 🚨 **Crisis Detection & Support** with immediate resource access
- ♿ **Full Accessibility Support** (WCAG 2.2 compliant)

---

## ✨ Key Features

### 🤖 Intelligent Conversational AI
- Context-aware responses using Google Gemini 2.5 Flash
- Persistent conversation history across sessions
- Empathetic, judgment-free support
- Proactive wellness check-ins based on mood patterns

### 🎭 Multimodal Emotion Detection

#### 🎤 Voice Sentiment Analysis
- Real-time emotion detection from voice input
- Detects: happy, sad, angry, anxious, fearful, calm, surprised, and more
- Uses TensorFlow.js speech-commands model
- Contextual responses based on detected emotions

#### 📹 Video Emotion Recognition
- Facial expression analysis using face-api.js
- Real-time emotion tracking through webcam
- Privacy-first: all processing happens locally in the browser
- Detects: happy, sad, angry, surprised, fearful, disgusted, neutral

### 🐝 Virtual Pet Companion ("Buddy")
- Interactive 3D pet that responds to your mood
- Dynamic stats: Happiness, Energy, Hunger
- Multiple actions: Feed, Play, Rest
- Pet's emotion changes based on care and your mood
- Gamification encourages regular check-ins

### 📊 Mood Tracking & Analytics
- Visual mood history with emoji timeline
- Trend analysis (improving, declining, stable)
- Session statistics (message count, duration)
- Proactive support when negative patterns detected

### 🧘‍♀️ Wellness Features
- **Guided Breathing Exercises**: 4-4-4-4 breathing technique
- **Quick Mood Replies**: Fast emotional check-ins
- **Proactive Nudges**: AI suggests breathing exercises when stress detected
- **Network Status Monitoring**: Offline support with graceful degradation

### 🚨 Crisis Detection & Support
- Real-time keyword detection for crisis situations
- Three-tier severity levels: mild, moderate, severe
- Immediate access to crisis resources:
  - 988 Suicide & Crisis Lifeline
  - Crisis Text Line (Text HOME to 741741)
  - SAMHSA National Helpline
- Safe dismissal option with continued support

### ♿ Accessibility Features (WCAG 2.2 Compliant)
- **Adjustable Text Size**: Small, Medium, Large options
- **High Contrast Mode**: Enhanced visibility for low vision users
- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Reader Optimized**: Proper ARIA labels and semantic HTML
- **Reduced Motion Support**: Respects `prefers-reduced-motion`
- **Color Blind Friendly**: Does not rely solely on color for information

---

## 🏗️ Architecture

### Frontend (React 19.2.0)
```
frontend/client/src/
├── App.js                 # Main application logic
├── App.css               # Comprehensive styling
├── LandingPage.js        # Welcome screen
├── Dashboard.js          # Main dashboard view
├── MoodTracker.js        # Mood visualization component
├── PetRoom.js            # Virtual pet interaction
├── VoiceSentiment.js     # Voice emotion detection
└── VideoSentiment.js     # Video emotion detection
```

**Key Technologies:**
- React 19 with Hooks (useState, useEffect, useCallback, useMemo)
- TensorFlow.js for ML models
- face-api.js for facial recognition
- React Three Fiber for 3D pet rendering
- CSS3 with modern animations and transitions

### Backend (FastAPI + Python)
```
backend/
├── main.py               # FastAPI server
├── chat_history.json     # Persistent conversation storage
└── .env                  # Environment variables (API keys)
```

**Key Technologies:**
- FastAPI for high-performance async API
- Google Generative AI (Gemini 2.5 Flash)
- Pydantic for data validation
- Async file operations for chat persistence
- CORS middleware for cross-origin requests

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.8+
- **Google API Key** (for Gemini AI)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-mental-wellness.git
cd ai-mental-wellness
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn google-generativeai python-dotenv aiofiles pydantic

# Create .env file
echo "GOOGLE_API_KEY=your_api_key_here" > .env

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup
```bash
cd frontend/client

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3001`

---

## 🔧 Configuration

### Backend Configuration (`backend/.env`)
```env
GOOGLE_API_KEY=your_google_api_key_here
```

### Available Gemini Models
- `gemini-2.5-flash` (default, fastest)
- `gemini-2.5-pro` (more capable)
- `gemini-2.0-flash`
- `gemini-flash-latest`
- `gemini-pro-latest`

### CORS Configuration
The backend allows requests from:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`

---

## 📖 Usage Guide

### First Time Setup
1. **Landing Page**: Click "Start Your Journey" to begin
2. **Enter Your Name**: Personalize your experience
3. **Main Chat**: Start conversing with the AI companion

### Chat Features
- **Text Input**: Type your feelings and press Enter or click Send
- **Quick Replies**: Click emoji buttons for fast mood check-ins
- **Voice Input**: Click 🎙️ to enable voice emotion detection
- **Video Input**: Click 📷 to enable facial emotion detection
- **Breathing Exercise**: Type "breathing" or click the button when offered

### Pet Interaction
1. Click the 🐝 icon in the header
2. Interact with Buddy using Feed, Play, or Rest buttons
3. Watch stats change based on actions and your mood
4. Return to chat anytime

### Accessibility
- **Text Size**: Click "A" button in header to cycle sizes
- **High Contrast**: Click ☀️/🌙 button to toggle
- **Keyboard**: Use Tab to navigate, Enter to activate

---

## 🛡️ Privacy & Security

- **Local Processing**: Voice and video analysis happens in your browser
- **No Video Storage**: Webcam feed is never recorded or transmitted
- **Encrypted Communication**: HTTPS recommended for production
- **Data Persistence**: Chat history stored locally on server
- **User Isolation**: Each user's data is separate and secure

---

## 🧪 Testing

```bash
cd frontend/client
npm test
```

---

## 📊 API Endpoints

### Health Check
```
GET /
GET /health
```

### Chat
```
POST /chat
Body: {
  "message": "string",
  "userName": "string",
  "moodHistory": [],
  "messageCount": 0,
  "crisisLevel": "none"
}
```

### Conversation Management
```
GET /conversation/{user_name}
DELETE /conversation/{user_name}
POST /clear-history
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for conversational intelligence
- **TensorFlow.js** for machine learning capabilities
- **face-api.js** for facial recognition
- **React Three Fiber** for 3D rendering
- **FastAPI** for high-performance backend

---

## 📞 Crisis Resources

If you're in crisis, please reach out:
- **988 Suicide & Crisis Lifeline**: Call or text 988
- **Crisis Text Line**: Text HOME to 741741
- **SAMHSA National Helpline**: 1-800-662-4357

---

## 👨‍💻 Developer

Built with ❤️ for mental health awareness and accessibility

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Group therapy sessions
- [ ] Integration with wearable devices
- [ ] Advanced analytics dashboard
- [ ] Therapist portal for professional monitoring
- [ ] Journaling feature with sentiment analysis
- [ ] Meditation and mindfulness exercises

---

**Remember: This application is a supportive tool and not a replacement for professional mental health care. Always consult with qualified healthcare providers for serious mental health concerns.**

