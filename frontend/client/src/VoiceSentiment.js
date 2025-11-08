import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as speechCommands from '@tensorflow-models/speech-commands';
import '@tensorflow/tfjs';

function VoiceSentiment({ onSentimentDetected }) {
  const [recognizer, setRecognizer] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Click to start listening...');
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [currentEmotion, setCurrentEmotion] = useState(null);
  
  // Web Speech API for hybrid approach
  const recognitionRef = useRef(null);
  const emotionCounterRef = useRef({});

  // Emotion mapping from speech commands to emotions
  const emotionMap = {
    'happy': 'happy',
    'yes': 'positive',
    'wow': 'surprised',
    'no': 'negative',
    'stop': 'angry',
    'go': 'excited',
    'up': 'positive',
    'down': 'sad',
    'left': 'neutral',
    'right': 'neutral',
    'one': 'neutral',
    'two': 'neutral',
    'three': 'neutral',
    'four': 'neutral',
    '_background_noise_': 'neutral',
    '_unknown_': 'uncertain'
  };

  // Load Speech Commands Model
  const loadModel = useCallback(async () => {
    try {
      setStatusMessage('Loading audio model...');
      const speechRecognizer = speechCommands.create('BROWSER_FFT');
      await speechRecognizer.ensureModelLoaded();
      setRecognizer(speechRecognizer);
      setStatusMessage('Model loaded. Ready to listen!');
      console.log('Available words:', speechRecognizer.wordLabels());
    } catch (err) {
      console.error('Error loading speech model:', err);
      setStatusMessage('Error: Could not load audio model.');
    }
  }, []);

  // Initialize Web Speech API for hybrid approach
  const initializeWebSpeechAPI = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const results = event.results;
        const transcript = results[results.length - 1][0].transcript.toLowerCase();
        
        // Analyze transcript for emotion keywords
        const detectedEmotion = analyzeTranscriptEmotion(transcript);
        if (detectedEmotion) {
          updateEmotionData(detectedEmotion, 0.8);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Analyze transcript for emotion keywords
  const analyzeTranscriptEmotion = (transcript) => {
    const emotionKeywords = {
      happy: ['happy', 'joy', 'great', 'excellent', 'wonderful', 'good', 'love'],
      sad: ['sad', 'unhappy', 'depressed', 'down', 'terrible', 'awful'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
      fearful: ['scared', 'afraid', 'anxious', 'worried', 'nervous'],
      surprised: ['wow', 'amazing', 'surprised', 'shocked', 'incredible'],
      neutral: ['okay', 'fine', 'alright']
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => transcript.includes(keyword))) {
        return emotion;
      }
    }
    return null;
  };

  // Update emotion data with confidence scores
  const updateEmotionData = useCallback((emotion, confidence) => {
    const timestamp = Date.now();
    
    // Update history
    setEmotionHistory(prev => [
      ...prev.slice(-19), // Keep last 20 entries
      { emotion, confidence, timestamp }
    ]);
    
    // Update confidence scores
    setConfidenceScores(prev => ({
      ...prev,
      [emotion]: confidence
    }));
    
    // Update current emotion
    setCurrentEmotion(emotion);
    
    // Call parent callback
    onSentimentDetected({
      emotion,
      confidence,
      timestamp,
      history: emotionHistory
    });
  }, [emotionHistory, onSentimentDetected]);

  // Enhanced start listening with continuous mode
  const startListening = async () => {
    if (!recognizer) {
      setStatusMessage('Model is not ready. Please wait.');
      return;
    }
    
    setIsListening(true);
    setStatusMessage('Listening...');

    // Start TensorFlow model
    recognizer.listen(result => {
      const scores = Array.from(result.scores);
      const wordList = recognizer.wordLabels();
      
      // Get top 3 predictions
      const topPredictions = scores
        .map((score, index) => ({ word: wordList[index], score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      
      const topWord = topPredictions[0].word;
      const topScore = topPredictions[0].score;
      
      console.log('Top predictions:', topPredictions);
      
      // Only process high-confidence detections
      if (topScore > 0.7) {
        const emotion = emotionMap[topWord] || 'neutral';
        
        // Smooth detection with counter
        emotionCounterRef.current[emotion] = (emotionCounterRef.current[emotion] || 0) + 1;
        
        // Only update if emotion detected multiple times
        if (emotionCounterRef.current[emotion] >= 2) {
          updateEmotionData(emotion, topScore);
          emotionCounterRef.current = {}; // Reset counter
        }
      }
    }, {
      includeSpectrogram: false,
      probabilityThreshold: 0.70,
      invokeCallbackOnNoiseAndUnknown: false,
      overlapFactor: 0.5
    });

    // Start Web Speech API for hybrid approach
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.log('Web Speech API already started or not available');
      }
    }
  };

  // Enhanced stop listening
  const stopListening = () => {
    if (recognizer && recognizer.isListening()) {
      recognizer.stopListening();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log('Web Speech API stop error');
      }
    }
    
    setIsListening(false);
    setStatusMessage('Click to start listening...');
    emotionCounterRef.current = {};
  };

  // Get dominant emotion from history
  const getDominantEmotion = useCallback(() => {
    if (emotionHistory.length === 0) return null;
    
    const emotionCounts = emotionHistory.reduce((acc, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }, [emotionHistory]);

  useEffect(() => {
    loadModel();
    initializeWebSpeechAPI();
    
    return () => {
      stopListening();
    };
  }, [loadModel, initializeWebSpeechAPI]);

  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="voice-sentiment-container">
      <button 
        onClick={handleToggleListen} 
        className="voice-toggle-btn" 
        disabled={!recognizer}
      >
        {isListening ? '🎤 Listening... (Click to Stop)' : '🎙️ Start Voice Input'}
      </button>
      
      <p className="voice-status">{statusMessage}</p>
      
      {/* Current emotion display */}
      {currentEmotion && (
        <div className="current-emotion">
          <h3>Current Emotion: {currentEmotion}</h3>
          <div className="confidence-score">
            Confidence: {(confidenceScores[currentEmotion] * 100).toFixed(1)}%
          </div>
        </div>
      )}
      
      {/* Emotion history */}
      {emotionHistory.length > 0 && (
        <div className="emotion-history">
          <h4>Recent Emotions:</h4>
          <div className="emotion-timeline">
            {emotionHistory.slice(-5).map((entry, index) => (
              <span key={index} className={`emotion-tag ${entry.emotion}`}>
                {entry.emotion} ({(entry.confidence * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
          <p className="dominant-emotion">
            Dominant: <strong>{getDominantEmotion()}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default VoiceSentiment;
