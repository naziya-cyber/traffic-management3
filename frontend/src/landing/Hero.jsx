import { useNavigate } from 'react-router-dom'
import React from 'react';
import TrafficScene from '../components/TrafficScene';

const Hero = () => {
  const navigate = useNavigate()
  return (
    <header className="main-hero">
      <div className="city-grid-overlay"></div>
      <div className="glow-sphere top-left"></div>
      <div className="glow-sphere bottom-right"></div>

      <div className="hero-content">
        <div className="main-headline">
          <span className="badge">Smart Traffic Management</span>
          <h1>
            Solving India's Traffic, <span className="">One Byte At A Time.</span>
          </h1>
          <p className="subtitle">
            A revolutionary, software-only traffic management system powered by existing digital data and scalable AI. No new hardware, just smarter decisions.
          </p>

          <div className="hero-cta-group">
            
            <button
              className="cta-primary"
              onClick={() => {
                console.log('Navigating to dashboard');
                navigate('/dashboard');
              }}
              style={{ cursor: 'pointer' }}
            >
              Launch Dashboard
            </button>
            <button className="cta-secondary">See How It Works ↓</button>
          </div>
        </div>

        <div className="concept-cards card">
          <div className="concept-side left">
            <h4>Traditional Systems</h4>
            <div className="hardware-icons">
              <div className="hardware-item disabled">
                <span className="status-icon">❌</span>
                <span className="label">Physical Cameras</span>
              </div>
              <div className="hardware-item disabled">
                <span className="status-icon">❌</span>
                <span className="label">Ground Sensors</span>
              </div>
            </div>
            <p className="description">Expensive, maintenance heavy, physically seeing the road.</p>
          </div>

          <div className="divider-glow">VS</div>

          <div className="concept-side right active-gradient">
            <h4><span className="">Your Software-Only System</span></h4>
            <div className="data-icons">
              <div className="data-item">
                <span className="icon-main">📱</span>
                <span className="label">Mobile Data</span>
              </div>
              <div className="data-item">
                <span className="icon-main">📍</span>
                <span className="label">GPS Locations</span>
              </div>
              <div className="data-item">
                <span className="icon-main">🌐</span>
                <span className="label">Live Traffic API</span>
              </div>
            </div>
            <p className="description">Zero hardware cost, scalable, digitally understanding the flow.</p>
          </div>
        </div>
      </div>

      {/* Animated Traffic Scene */}
      <TrafficScene />
    </header>
  );
};

export default Hero;