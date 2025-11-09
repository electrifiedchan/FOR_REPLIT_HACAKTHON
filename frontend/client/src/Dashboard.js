import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard({ userName, onLogout, onStartChat }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">Mental Wellness Companion</span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1 className="welcome-title">{greeting}, <span className="neon-highlight">{userName}</span>! 👋</h1>
          <p className="welcome-subtitle">Welcome to your <span className="neon-cyan">personal</span> mental wellness space</p>
        </div>

        <div className="dashboard-grid">
          {/* User Info Card */}
          <div className="dashboard-card user-info-card">
            <div className="card-icon">👤</div>
            <h3 className="card-title">Your Profile</h3>
            <div className="user-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{userName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Member Since:</span>
                <span className="detail-value">{formatDate(new Date())}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Current Time:</span>
                <span className="detail-value">{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="dashboard-card actions-card">
            <div className="card-icon">⚡</div>
            <h3 className="card-title">Quick Actions</h3>
            <div className="action-buttons">
              <button className="action-btn primary-action" onClick={onStartChat}>
                <span className="action-icon">💬</span>
                <span className="action-text">Start Chat</span>
              </button>
              <button className="action-btn" onClick={() => alert('Mood Tracker coming soon!')}>
                <span className="action-icon">📊</span>
                <span className="action-text">Track Mood</span>
              </button>
              <button className="action-btn" onClick={() => alert('Pet Room coming soon!')}>
                <span className="action-icon">🐱</span>
                <span className="action-text">Visit Pet</span>
              </button>
              <button className="action-btn" onClick={() => alert('Breathing Exercise coming soon!')}>
                <span className="action-icon">🧘</span>
                <span className="action-text">Breathe</span>
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="dashboard-card stats-card">
            <div className="card-icon">📈</div>
            <h3 className="card-title">Your Wellness Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">0<span className="stat-plus">+</span></div>
                <div className="stat-label">Sessions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0<span className="stat-plus">+</span></div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0<span className="stat-plus">+</span></div>
                <div className="stat-label">Moods Tracked</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">0<span className="stat-plus">+</span></div>
                <div className="stat-label">Days Active</div>
              </div>
            </div>
          </div>

          {/* Wellness Tips Card */}
          <div className="dashboard-card tips-card">
            <div className="card-icon">💡</div>
            <h3 className="card-title">Daily Wellness Tip</h3>
            <div className="tip-content">
              <p className="tip-text">
                "Take a moment to breathe deeply. Even 5 minutes of mindful breathing 
                can help reduce stress and improve your mental clarity."
              </p>
              <div className="tip-footer">
                <span className="tip-emoji">🌟</span>
                <span className="tip-category">Mindfulness</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-footer">
          <p className="footer-text">
            Remember: You're not alone. We're here to support you 24/7. 💚
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

