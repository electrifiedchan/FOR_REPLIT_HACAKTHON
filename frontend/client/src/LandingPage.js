import React from 'react';

function LandingPage({ onStart }) {
  return (
    <div className="App">
      <div className="landing-page">
        <div className="landing-hero">
          <h1 className="landing-title">
            <span className="title-gradient">Mental Wellness</span>
            <span className="title-highlight">Companion</span>
          </h1>
          
          <p className="landing-tagline">
            AI-Powered Empathetic Support for Everyone
          </p>

          <p className="landing-features-text">
            Available 24/7 • Zero Bias • 100% Confidential
          </p>
        </div>

        <div className="landing-stats">
          <div className="stat">
            <span className="stat-icon">👥</span>
            <p className="stat-text">30M+ Indians with Disabilities</p>
          </div>
          <div className="stat">
            <span className="stat-icon">❤️</span>
            <p className="stat-text">7.5% Population with Mental Health Issues</p>
          </div>
          <div className="stat">
            <span className="stat-icon">🕐</span>
            <p className="stat-text">24/7 Always Available for You</p>
          </div>
        </div>

        <div className="landing-features">
          <h2 className="features-title">✨ Why Choose Us?</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-name">Empathetic AI</h3>
              <p className="feature-description">
                Real-time responses that truly understand your feelings
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚨</div>
              <h3 className="feature-name">Crisis Safety</h3>
              <p className="feature-description">
                Instant detection & Indian helpline resources when needed
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3 className="feature-name">Memory & Context</h3>
              <p className="feature-description">
                Bot remembers your journey & personalizes support
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">♿</div>
              <h3 className="feature-name">Accessible to All</h3>
              <p className="feature-description">
                WCAG AA compliant, keyboard navigation, screen reader ready
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-name">Mobile First</h3>
              <p className="feature-description">
                Works perfectly on your phone, anytime, anywhere
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-name">100% Private</h3>
              <p className="feature-description">
                Your conversations stay encrypted and completely private
              </p>
            </div>
          </div>
        </div>

        <button className="landing-cta" onClick={onStart}>
          <span className="cta-text">Start Chatting Now</span>
          <span className="cta-arrow">→</span>
        </button>

        <p className="landing-footer">
          Join thousands getting mental health support today
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
