import React, { useState, useEffect } from 'react';

// Import cat images
import happyCat from './assets/cats/happy-cat.png';
import sadCat from './assets/cats/sad-cat.png';
import neutralCat from './assets/cats/neutral-cat.png';
import excitedCat from './assets/cats/excited-cat.png';
import anxiousCat from './assets/cats/anxious-cat.png';
import frustratedCat from './assets/cats/frustrated-cat.png';

function PetRoom({ userName, moodHistory = [], onBackToChat }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Pet stats
  const [petStats, setPetStats] = useState({
    happiness: 70,
    hunger: 40,
    energy: 70,
    health: 80
  });

  // ✅ STEP 1: User Emoji → Update Stats
  useEffect(() => {
    if (moodHistory && moodHistory.length > 0) {
      const lastMood = moodHistory[moodHistory.length - 1];
      const emoji = lastMood.emoji;
      
      if (!emoji) return;
      
      console.log('🎭 User emoji changed to:', emoji);
      
      let newStats = { ...petStats };
      
      switch (emoji) {
        // Excited/Very Happy
        case '😁': case '😄': case '🤩': case '😍':
          newStats = { 
            happiness: 95, 
            hunger: 20, 
            energy: 90, 
            health: Math.min(100, petStats.health + 10) 
          };
          console.log('→ Set to EXCITED stats');
          break;
        
        // Happy
        case '😊': case '🙂': case '😌': case '☺️':
          newStats = { 
            happiness: 75, 
            hunger: 35, 
            energy: 70, 
            health: Math.min(100, petStats.health + 5) 
          };
          console.log('→ Set to HAPPY stats');
          break;
        
        // Sad (low happiness, LOW hunger to avoid conflict)
        case '😢': case '😭': case '😞': case '☹️': case '🙁':
          newStats = { 
            happiness: 20, 
            hunger: 35, 
            energy: 40, 
            health: Math.max(0, petStats.health - 5) 
          };
          console.log('→ Set to SAD stats');
          break;
        
        // Anxious (very low energy is key)
        case '😰': case '😨': case '😟': case '😥': case '😓':
          newStats = { 
            happiness: 40, 
            hunger: 50, 
            energy: 20, 
            health: Math.max(0, petStats.health - 3) 
          };
          console.log('→ Set to ANXIOUS stats');
          break;
        
        // Frustrated (VERY high hunger is key!)
        case '😤': case '😠': case '😡': case '🤬': case '😖':
          newStats = { 
            happiness: 30, 
            hunger: 85, 
            energy: 40, 
            health: Math.max(0, petStats.health - 5) 
          };
          console.log('→ Set to FRUSTRATED stats');
          break;
        
        // Neutral
        case '😐': case '😑': case '🤔':
        default:
          newStats = { 
            happiness: 55, 
            hunger: 45, 
            energy: 55, 
            health: petStats.health 
          };
          console.log('→ Set to NEUTRAL stats');
      }
      
      setPetStats(newStats);
    }
  }, [moodHistory.length]);

  // ✅ STEP 2: Stats → Cat Image (dynamically calculated)
  const getCatImageFromStats = () => {
    const { happiness, hunger, energy, health } = petStats;
    
    console.log('🔍 Current stats:', { happiness, hunger, energy, health });
    
    // PRIORITY 1: Critical health
    if (health <= 20) {
      console.log('→ Cat: SAD (critical health)');
      return sadCat;
    }
    
    // PRIORITY 2: Frustrated (VERY high hunger AND low happiness)
    if (hunger > 75 && happiness < 50) {
      console.log('→ Cat: FRUSTRATED (very hungry + unhappy)');
      return frustratedCat;
    }
    
    // PRIORITY 3: Anxious (VERY low energy)
    if (energy < 25) {
      console.log('→ Cat: ANXIOUS (very low energy)');
      return anxiousCat;
    }
    
    // PRIORITY 4: Sad (specifically low happiness with moderate hunger)
    if (happiness < 40 && hunger < 60) {
      console.log('→ Cat: SAD (low happiness)');
      return sadCat;
    }
    
    // PRIORITY 5: Excited (everything is great!)
    if (happiness >= 80 && hunger < 30 && energy > 70) {
      console.log('→ Cat: EXCITED (thriving)');
      return excitedCat;
    }
    
    // PRIORITY 6: Happy (good stats)
    if (happiness >= 60 && hunger < 50) {
      console.log('→ Cat: HAPPY');
      return happyCat;
    }
    
    // PRIORITY 7: Neutral (moderate concerns)
    if (energy < 50 || hunger > 50) {
      console.log('→ Cat: NEUTRAL (moderate concerns)');
      return neutralCat;
    }
    
    // DEFAULT: Happy
    console.log('→ Cat: HAPPY (default)');
    return happyCat;
  };

  // Get title from stats
  const getTitleFromStats = () => {
    const { happiness, hunger, energy, health } = petStats;
    
    if (health < 20) return 'Buddy is in critical condition! ❤️‍🩹';
    if (hunger > 90) return 'Buddy is starving! 🍎';
    if (energy < 10) return 'Buddy is exhausted! 😴';
    if (hunger > 75 && happiness < 50) return 'Buddy is frustrated! 😤';
    if (energy < 25) return 'Buddy is anxious 😰';
    if (happiness < 40) return 'Buddy is sad 😢';
    if (happiness >= 80 && hunger < 30 && energy > 70) return 'Buddy is thriving! 🌟';
    if (happiness >= 60) return 'Buddy is happy! 😊';
    return 'Buddy is doing okay 😌';
  };

  // ✅ AUTO-DECAY (Every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setPetStats(prev => {
        const newStats = {
          happiness: Math.max(0, prev.happiness - 2),
          hunger: Math.min(100, prev.hunger + 3),
          energy: Math.max(0, prev.energy - 2),
          health: prev.health
        };
        
        // Health penalty
        if (prev.hunger > 80) newStats.health = Math.max(0, newStats.health - 2);
        if (prev.energy < 20) newStats.health = Math.max(0, newStats.health - 2);
        if (prev.happiness < 30) newStats.health = Math.max(0, newStats.health - 1);
        else newStats.health = Math.max(0, newStats.health - 1);
        
        console.log('⏰ Stats decayed');
        return newStats;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // ✅ FEEDBACK HELPER
  const showFeedbackMessage = (message) => {
    setFeedbackMessage(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };

  // ✅ ACTION: FEED
  const handleFeed = () => {
    if (petStats.hunger < 10) {
      showFeedbackMessage('🍎 Buddy is already full!');
      return;
    }
    setPetStats(prev => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - 40),
      happiness: Math.min(100, prev.happiness + 10),
      health: Math.min(100, prev.health + 5)
    }));
    showFeedbackMessage('🍎 Yum! Buddy feels much better!');
  };

  // ✅ ACTION: PLAY
  const handlePlay = () => {
    if (petStats.energy < 20) {
      showFeedbackMessage('😴 Buddy is too tired to play!');
      return;
    }
    if (petStats.hunger > 80) {
      showFeedbackMessage('🍎 Buddy is too hungry to play!');
      return;
    }
    setPetStats(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 25),
      energy: Math.max(0, prev.energy - 25),
      hunger: Math.min(100, prev.hunger + 15),
      health: Math.min(100, prev.health + 3)
    }));
    showFeedbackMessage('🎾 Buddy had an amazing time playing!');
  };

  // ✅ ACTION: PET
  const handlePet = () => {
    setPetStats(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 8),
      health: Math.min(100, prev.health + 2)
    }));
    showFeedbackMessage('🖐️ Buddy loves your affection!');
  };

  // ✅ ACTION: REST
  const handleRest = () => {
    if (petStats.energy > 90) {
      showFeedbackMessage('😊 Buddy is full of energy!');
      return;
    }
    setPetStats(prev => ({
      ...prev,
      energy: Math.min(100, prev.energy + 40),
      happiness: Math.min(100, prev.happiness + 8),
      health: Math.min(100, prev.health + 5),
      hunger: Math.min(100, prev.hunger + 10)
    }));
    showFeedbackMessage('😴 Buddy had a wonderful nap!');
  };

  // ✅ GET STAT COLOR
  const getStatColor = (value, inverse = false) => {
    if (inverse) {
      if (value <= 30) return '#4ecdc4';
      if (value <= 60) return '#ffd93d';
      return '#ff8787';
    }
    if (value >= 70) return '#4ecdc4';
    if (value >= 40) return '#ffd93d';
    return '#ff8787';
  };

  const currentImage = getCatImageFromStats();

  return (
    <div className="pet-room-container">
      <button onClick={onBackToChat} className="pet-room-back-btn">
        <span className="back-arrow">←</span>
        <span className="back-text">Back to Chat</span>
      </button>
      
      <div className="pet-room-content">
        <div className="pet-room-header">
          <h1 className="pet-room-title">{userName}'s Buddy Room</h1>
          <p className="pet-room-subtitle">{getTitleFromStats()}</p>
        </div>

        <div className="pet-display-section">
          <div className="pet-2d-body">
            <img 
              src={currentImage} 
              className="pet-2d-face"
              alt="Buddy the cat"
              onError={(e) => e.target.src = neutralCat}
            />
            <div 
              className="pet-mood-ring" 
              style={{ borderColor: getStatColor(petStats.health) }}
            />
          </div>
        </div>

        {showFeedback && (
          <div className="pet-interaction-feedback" role="alert">
            <span className="feedback-icon">💬</span>
            <span className="feedback-text">{feedbackMessage}</span>
          </div>
        )}

        <div className="pet-stats-container">
          <div className="pet-stat-item">
            <div className="stat-header">
              <div className="stat-label-group">
                <span className="stat-icon">💖</span>
                <span className="stat-label">Happiness</span>
              </div>
              <span className="stat-value">{petStats.happiness}%</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill" 
                style={{ 
                  width: `${petStats.happiness}%`,
                  backgroundColor: getStatColor(petStats.happiness)
                }}
              />
            </div>
          </div>

          <div className="pet-stat-item">
            <div className="stat-header">
              <div className="stat-label-group">
                <span className="stat-icon">🍎</span>
                <span className="stat-label">Hunger</span>
              </div>
              <span className="stat-value">{petStats.hunger}%</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill" 
                style={{ 
                  width: `${petStats.hunger}%`,
                  backgroundColor: getStatColor(petStats.hunger, true)
                }}
              />
            </div>
          </div>

          <div className="pet-stat-item">
            <div className="stat-header">
              <div className="stat-label-group">
                <span className="stat-icon">⚡</span>
                <span className="stat-label">Energy</span>
              </div>
              <span className="stat-value">{petStats.energy}%</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill" 
                style={{ 
                  width: `${petStats.energy}%`,
                  backgroundColor: getStatColor(petStats.energy)
                }}
              />
            </div>
          </div>

          <div className="pet-stat-item">
            <div className="stat-header">
              <div className="stat-label-group">
                <span className="stat-icon">❤️</span>
                <span className="stat-label">Health</span>
              </div>
              <span className="stat-value">{petStats.health}%</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill" 
                style={{ 
                  width: `${petStats.health}%`,
                  backgroundColor: getStatColor(petStats.health)
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="pet-interaction-buttons">
          <button className="pet-action-btn" onClick={handleFeed}>
            <span className="btn-icon">🍎</span>
            <span className="btn-label">Feed</span>
          </button>
          
          <button className="pet-action-btn" onClick={handlePlay}>
            <span className="btn-icon">🎾</span>
            <span className="btn-label">Play</span>
          </button>
          
          <button className="pet-action-btn" onClick={handlePet}>
            <span className="btn-icon">🖐️</span>
            <span className="btn-label">Pet</span>
          </button>
          
          <button className="pet-action-btn" onClick={handleRest}>
            <span className="btn-icon">😴</span>
            <span className="btn-label">Rest</span>
          </button>
        </div>

        <div className="pet-tips-section">
          <h2 className="tips-title">
            <span>💡</span>
            Care Guide
          </h2>
          <ul className="tips-list">
            <li>Your emoji sets Buddy's initial stats</li>
            <li>Actions change stats, stats change Buddy's emotion!</li>
            <li>Feed when hungry, Rest when tired</li>
            <li>Play to boost happiness quickly!</li>
            <li>Stats decay every minute - check regularly!</li>
          </ul>
        </div>

        {moodHistory && moodHistory.length > 0 && (
          <div className="pet-mood-summary">
            <h2 className="summary-title">
              <span>📊</span>
              Recent Mood History
            </h2>
            <div className="mood-history-emojis">
              {moodHistory.slice(-10).reverse().map((mood, index) => (
                <span 
                  key={index} 
                  className="mood-history-emoji"
                  title={mood.mood || 'Unknown'}
                >
                  {mood.emoji || '😊'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PetRoom;
