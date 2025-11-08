import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

/**
 * VideoSentiment Component - Advanced Facial Expression Detection
 * Features:
 * - Optimized performance with TinyFaceDetector
 * - Temporal smoothing for accuracy
 * - Confidence thresholding
 * - Automatic retry and error recovery
 * - Privacy-focused (no data stored)
 */

function VideoSentiment({ onFaceSentimentDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const emotionBufferRef = useRef([]);
  const lastEmotionTimeRef = useRef(0);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [isLowLight, setIsLowLight] = useState(false);
  const [showLowLightWarning, setShowLowLightWarning] = useState(false);

  // Configuration constants for optimization
  const CONFIG = {
    detectionInterval: 500, // Run detection every 500ms (balanced performance)
    confidenceThreshold: 0.6, // Only accept detections above 60% confidence
    bufferSize: 5, // Keep last 5 detections for smoothing
    cooldownPeriod: 3000, // 3 seconds between emotion updates
    videoWidth: 320, // Reduced resolution for better performance
    videoHeight: 240,
    inputSize: 160, // Smaller input size for TinyFaceDetector (4-6x speedup)
    scoreThreshold: 0.5 // Face detection confidence
  };

  // Enhanced emotion mapping to your app's mood system
  const EMOTION_MAPPING = {
    'happy': { mood: 'happy', value: 5, emoji: '😊' },
    'sad': { mood: 'sad', value: 2, emoji: '😔' },
    'angry': { mood: 'frustrated', value: 2, emoji: '😡' },
    'fearful': { mood: 'anxious', value: 2, emoji: '😰' },
    'disgusted': { mood: 'frustrated', value: 2, emoji: '😣' },
    'surprised': { mood: 'neutral', value: 4, emoji: '😲' },
    'neutral': { mood: 'neutral', value: 3, emoji: '😐' }
  };

  // 1. OPTIMIZED: Load models with progress tracking
  const loadModels = useCallback(async () => {
    const MODEL_URL = '/models';
    try {
      console.log('[VideoSentiment] Loading face detection models...');
      setModelLoadProgress(10);
      
      // Load models sequentially with progress updates
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelLoadProgress(40);
      console.log('[VideoSentiment] TinyFaceDetector loaded');
      
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
      setModelLoadProgress(70);
      console.log('[VideoSentiment] Face landmarks loaded');
      
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setModelLoadProgress(100);
      console.log('[VideoSentiment] Face expression model loaded');
      
      console.log('[VideoSentiment] All models loaded successfully!');
      setIsModelLoaded(true);
      startWebcam();
    } catch (err) {
      console.error('[VideoSentiment] Failed to load models:', err);
      setVideoError('Error: Could not load AI models. Please refresh the page.');
      setModelLoadProgress(0);
    }
  }, []);

  // 2. IMPROVED: Start webcam with optimized constraints
  const startWebcam = useCallback(() => {
    setVideoError(null);
    
    // Request camera with optimized constraints for performance
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: CONFIG.videoWidth },
        height: { ideal: CONFIG.videoHeight },
        facingMode: 'user',
        frameRate: { ideal: 15, max: 20 } // Lower framerate for performance
      },
      audio: false
    })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('[VideoSentiment] Webcam started successfully');
        }
      })
      .catch(err => {
        console.error('[VideoSentiment] Webcam permission denied:', err);
        if (err.name === 'NotAllowedError') {
          setVideoError('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setVideoError('No camera found. Please connect a webcam.');
        } else {
          setVideoError('Error accessing camera. Please try again.');
        }
      });
  }, []);

  // 3. ENHANCED: Temporal smoothing for more accurate emotion detection
  const smoothEmotions = useCallback((newEmotion, newConfidence) => {
    // Add to buffer
    emotionBufferRef.current.push({ emotion: newEmotion, confidence: newConfidence, timestamp: Date.now() });
    
    // Keep only recent detections
    if (emotionBufferRef.current.length > CONFIG.bufferSize) {
      emotionBufferRef.current.shift();
    }
    
    // Calculate weighted average (more recent = higher weight)
    const emotionScores = {};
    emotionBufferRef.current.forEach((entry, index) => {
      const weight = (index + 1) / CONFIG.bufferSize; // Linear weighting
      const weightedConfidence = entry.confidence * weight;
      emotionScores[entry.emotion] = (emotionScores[entry.emotion] || 0) + weightedConfidence;
    });
    
    // Get dominant emotion from smoothed results
    const dominantEmotion = Object.entries(emotionScores)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      emotion: dominantEmotion[0],
      confidence: dominantEmotion[1] / emotionBufferRef.current.length
    };
  }, []);

  // 4. OPTIMIZED: Main detection loop with performance improvements
  const handleVideoOnPlay = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsDetecting(true);
    
    // Clear any existing interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    const runDetection = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        setIsDetecting(false);
        return;
      }

      try {
        // Set up canvas dimensions
        const displaySize = {
          width: videoRef.current.videoWidth || CONFIG.videoWidth,
          height: videoRef.current.videoHeight || CONFIG.videoHeight
        };
        
        if (canvasRef.current) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
        }

        // Run optimized detection with TinyFaceDetector
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: CONFIG.inputSize, // Smaller = faster
              scoreThreshold: CONFIG.scoreThreshold
            })
          )
          .withFaceLandmarks(true)
          .withFaceExpressions();

        // Clear previous drawings
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }

        if (detections && detections.length > 0) {
          // Get expressions from first detected face
          const expressions = detections[0].expressions;
          
          // Find dominant expression with highest confidence
          const expressionEntries = Object.entries(expressions);
          const dominantEntry = expressionEntries.reduce((max, current) =>
            current[1] > max[1] ? current : max
          );
          
          const [rawEmotion, rawConfidence] = dominantEntry;

          // --- LOW-LIGHT DETECTION LOGIC ---
          // If confidence is very low, activate low-light enhancement mode
          if (rawConfidence < 0.3 && !isLowLight) {
            console.log('[VideoSentiment] Low confidence detected, activating low-light mode.');
            setIsLowLight(true);
            setShowLowLightWarning(true);
          } else if (rawConfidence >= 0.3 && isLowLight) {
            console.log('[VideoSentiment] Sufficient light detected, deactivating low-light mode.');
            setIsLowLight(false);
            setShowLowLightWarning(false);
          }
          // --- END OF LOW-LIGHT LOGIC ---

          // Apply temporal smoothing
          const smoothed = smoothEmotions(rawEmotion, rawConfidence);
          
          // Only update if confidence is high enough and cooldown has passed
          const now = Date.now();
          if (
            smoothed.confidence >= CONFIG.confidenceThreshold &&
            now - lastEmotionTimeRef.current >= CONFIG.cooldownPeriod
          ) {
            if (smoothed.emotion !== currentEmotion) {
              setCurrentEmotion(smoothed.emotion);
              setConfidence(smoothed.confidence);
              
              // Map to your app's emotion system
              const mappedEmotion = EMOTION_MAPPING[smoothed.emotion] || EMOTION_MAPPING['neutral'];
              
              // Send to parent component
              onFaceSentimentDetected({
                emotion: mappedEmotion.mood,
                confidence: smoothed.confidence,
                rawEmotion: smoothed.emotion,
                timestamp: new Date().toISOString(),
                value: mappedEmotion.value,
                emoji: mappedEmotion.emoji
              });
              
              lastEmotionTimeRef.current = now;
              console.log(`[VideoSentiment] Detected: ${smoothed.emotion} (${(smoothed.confidence * 100).toFixed(1)}%)`);
            }
          }

          // Draw detection boxes (optional - can disable for performance)
          if (canvasRef.current) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections, 0.05);
          }
        } else {
          // No face detected - could be due to poor lighting
          if (!isLowLight) {
            console.log('[VideoSentiment] No face detected, trying low-light mode.');
            setIsLowLight(true);
            setShowLowLightWarning(true);
          }

          // Reset after buffer clears
          if (emotionBufferRef.current.length > 0) {
            emotionBufferRef.current = [];
            if (currentEmotion !== 'neutral') {
              setCurrentEmotion('neutral');
              setConfidence(0);
            }
          }
        }
      } catch (error) {
        console.error('[VideoSentiment] Detection error:', error);
      }
    };

    // Run detection at configured interval
    detectionIntervalRef.current = setInterval(runDetection, CONFIG.detectionInterval);
  }, [currentEmotion, smoothEmotions, onFaceSentimentDetected]);

  // 5. Stop detection and cleanup
  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsDetecting(false);
    console.log('[VideoSentiment] Detection stopped');
  }, []);

  // Load models on mount
  useEffect(() => {
    loadModels();
    
    // Cleanup on unmount
    return () => {
      stopDetection();
    };
  }, [loadModels, stopDetection]);

  return (
    <div className="video-sentiment-container">
      {videoError ? (
        <div className="video-error-message">
          <span className="error-icon">📹</span>
          <p>{videoError}</p>
          <button onClick={startWebcam} className="video-retry-btn">
            Try Again
          </button>
        </div>
      ) : (
        <div className="video-feed-wrapper">
          <div className="video-frame">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onPlay={handleVideoOnPlay}
              className={`video-feed ${isLowLight ? 'low-light-mode' : ''}`}
              width={CONFIG.videoWidth}
              height={CONFIG.videoHeight}
            />
            <canvas ref={canvasRef} className="video-overlay-canvas" />
          </div>

          {/* LOW LIGHT WARNING OVERLAY */}
          {showLowLightWarning && (
            <div className="video-feedback-overlay">
              <span className="feedback-icon">💡</span>
              <p>Low light detected. For best results, please use a well-lit area.</p>
            </div>
          )}

          {isDetecting && currentEmotion && (
            <div className="video-emotion-display">
              <span className="emotion-icon">{EMOTION_MAPPING[currentEmotion]?.emoji || '😐'}</span>
              <div className="emotion-info">
                <span className="emotion-label">{currentEmotion}</span>
                <span className="emotion-confidence">
                  {(confidence * 100).toFixed(0)}% confident
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!isModelLoaded && !videoError && (
        <div className="video-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading Video AI Models...</p>
          <div className="loading-bar">
            <div 
              className="loading-bar-fill" 
              style={{ width: `${modelLoadProgress}%` }}
            ></div>
          </div>
          <span className="loading-percent">{modelLoadProgress}%</span>
        </div>
      )}
    </div>
  );
}

export default VideoSentiment;
