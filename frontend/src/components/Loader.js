import React from 'react';
import './Loader.css';

const Loader = ({ message = "Loading...", subtitle = "Setting up your dashboard and analyzing trends..." }) => {
  return (
    <div className="loader-overlay">
      <div className="loader-container">
        <div className="loader-spinner">
          {/* Circular progress ring */}
          <svg className="progress-ring" width="120" height="120">
            <circle
              className="progress-ring-circle-bg"
              stroke="rgba(150, 120, 220, 0.2)"
              strokeWidth="3"
              fill="transparent"
              r="56"
              cx="60"
              cy="60"
            />
            <circle
              className="progress-ring-circle"
              stroke="rgb(0, 130, 115)"
              strokeWidth="3"
              fill="transparent"
              r="56"
              cx="60"
              cy="60"
              strokeDasharray="351.86"
              strokeDashoffset="0"
            />
          </svg>
          
          {/* Center logo/icon */}
          <div className="loader-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3v18h18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 9l-5 5-3-3-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="9" r="1.5" fill="white"/>
              <circle cx="13" cy="14" r="1.5" fill="white"/>
              <circle cx="10" cy="11" r="1.5" fill="white"/>
              <circle cx="6" cy="15" r="1.5" fill="white"/>
            </svg>
          </div>
        </div>
        <p className="loader-message">{message}</p>
        <p className="loader-subtitle">{subtitle}</p>
      </div>
    </div>
  );
};

export default Loader;
