import React from 'react';
import './HomePage.css';

export default function HomePage({ onStart }) {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">
          PDA<span className="home-title-highlight">SIMULATOR</span>
        </h1>
        <p className="home-subtitle">
          The ultimate Pushdown Automaton simulator. Build, visualize, and test your NPDA with a modern engineering dashboard and AI generation.
        </p>
        <button className="home-start-btn" onClick={() => onStart('sim')}>
          Start Simulating <span className="arrow">→</span>
        </button>
      </div>
      <div className="home-features">
        <div className="feature-card" onClick={() => onStart('ai')} style={{ cursor: 'pointer' }}>
          <div className="feature-icon">🤖</div>
          <h3>AI Generator</h3>
          <p>Describe your language in plain English and let AI build the PDA automatically.</p>
        </div>
        <div className="feature-card" onClick={() => onStart('diag')} style={{ cursor: 'pointer' }}>
          <div className="feature-icon">📊</div>
          <h3>Live Diagrams</h3>
          <p>Visualize states and transitions dynamically with our interactive canvas.</p>
        </div>
        <div className="feature-card" onClick={() => onStart('batch')} style={{ cursor: 'pointer' }}>
          <div className="feature-icon">🧪</div>
          <h3>Batch Testing</h3>
          <p>Test multiple input strings simultaneously and verify your logic instantly.</p>
        </div>
      </div>
    </div>
  );
}
