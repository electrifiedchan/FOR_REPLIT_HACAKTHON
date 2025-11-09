import React from 'react';

function LandingPage({ onStart }) {
  return (
    <div className="landing-page">
        <div className="landing-hero">
          <h1 className="landing-title fade-in-down">
            <span className="title-gradient">Mental Wellness</span>{' '}
            <span className="title-highlight neon-word">Companion</span>
          </h1>

          <p className="landing-tagline fade-in delay-1">
            <span className="neon-cyan">AI-Powered</span> Empathetic Support for Everyone
          </p>

          <p className="landing-features-text fade-in delay-2">
            Available <span className="neon-highlight">24/7</span> • Zero Bias • <span className="neon-highlight">100%</span> Confidential
          </p>
        </div>

        <div className="landing-stats">
          <div className="stat fade-in-up delay-3">
            <span className="stat-icon">👥</span>
            <p className="stat-text"><span className="neon-highlight">30M+</span> Indians with Disabilities</p>
          </div>
          <div className="stat fade-in-up delay-4">
            <span className="stat-icon">❤️</span>
            <p className="stat-text"><span className="neon-highlight">7.5%</span> Population with Mental Health Issues</p>
          </div>
          <div className="stat fade-in-up delay-5">
            <span className="stat-icon">🕐</span>
            <p className="stat-text"><span className="neon-highlight">24/7</span> Always Available for You</p>
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

        <button className="landing-start-btn" onClick={onStart}>
          <span className="cta-text">Start Chatting Now</span>
          <span className="btn-arrow">→</span>
        </button>

        <p className="landing-footer">
          Join thousands getting mental health support today
        </p>
      </div>
  );
}

export default LandingPage;
