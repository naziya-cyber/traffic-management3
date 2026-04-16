import React from 'react';

const Architecture = () => {
  return (
    <section className="architecture-section">
      <div className="section-header">
        <h2> System Architecture</h2>
        <p className="viva-note"></p>
      </div>

      <div className="flow-container">
        {/* Step 1: Input */}
        <div className="card arch-card">
          <div className="step-number">1</div>
          <h3>Input (Data)</h3>
          <ul className="arch-list">
            <li>Google Maps API</li>
            <li>User Crowdsourcing</li>
            <li>Historical Patterns</li>
          </ul>
        </div>

        <div className="flow-arrow">➡️</div>

        {/* Step 2: The Brain */}
        <div className="card arch-card brain">
          <div className="step-number">2</div>
          <h3>The AI Brain</h3>
          <ul className="arch-list">
            <li>Pattern Recognition</li>
            <li>Traffic Prediction</li>
            <li>Solution Suggestion</li>
          </ul>
        </div>

        <div className="flow-arrow">➡️</div>

        {/* Step 3: Output */}
        <div className="card arch-card">
          <div className="step-number">3</div>
          <h3>Output</h3>
          <ul className="arch-list">
            <li>User Mobile App</li>
            <li>Police Dashboard</li>
            <li>Live Heatmaps</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Architecture;