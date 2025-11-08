import React, { useMemo, useState } from 'react';

function MoodTracker({ history, trend }) {
  const [expandedView, setExpandedView] = useState(false);

  const moodStats = useMemo(() => {
    if (!history || history.length === 0) return null;

    const moodMap = {};
    let totalValue = 0;

    history.forEach((item) => {
      const mood = item.mood || 'unknown';
      const value = item.value || 3;
      moodMap[mood] = (moodMap[mood] || 0) + 1;
      totalValue += value;
    });

    return {
      average: (totalValue / history.length).toFixed(1),
      count: history.length,
      moodMap,
    };
  }, [history]);

  if (!moodStats) {
    return (
      <div className="mood-tracker-empty">
        <p className="mood-tracker-empty-text">
          💚 Click emotions to track your wellness journey!
        </p>
      </div>
    );
  }

  return (
    <div className="mood-tracker-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#b0b3c1', fontSize: '0.9rem' }}>Avg: </span>
          <span style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {moodStats.average}/5
          </span>
        </div>
        <button
          onClick={() => setExpandedView(!expandedView)}
          style={{
            background: 'rgba(255, 20, 147, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          {expandedView ? '−' : '+'}
        </button>
      </div>

      {expandedView && (
        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#b0b3c1' }}>
          {moodStats.count} moods tracked
        </div>
      )}
    </div>
  );
}

export default MoodTracker;
