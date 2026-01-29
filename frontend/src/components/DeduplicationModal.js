import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DeduplicationModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DeduplicationModal = ({ isOpen, onClose, onComplete }) => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let pollInterval;

    if (isOpen && status?.is_running) {
      // Poll for status updates every 2 seconds
      pollInterval = setInterval(() => {
        fetchStatus();
      }, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status?.is_running]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/deduplication/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStatus(response.data.status);

      // If completed, notify parent
      if (response.data.status.current_stage === 'completed' && response.data.status.completed_at) {
        setTimeout(() => {
          onComplete && onComplete(response.data.status);
        }, 2000);
      }
    } catch (err) {
      console.error('Error fetching deduplication status:', err);
    }
  };

  const startDeduplication = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/deduplication/start`,
        { threshold: 0.90 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setStatus(response.data.status);
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting deduplication:', err);
      setError(err.response?.data?.error || 'Failed to start deduplication');
      setIsLoading(false);
    }
  };

  const resetAndClose = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/deduplication/reset`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch (err) {
      console.error('Error resetting status:', err);
    }
    setStatus(null);
    setError(null);
    onClose();
  };

  const getStageText = (stage) => {
    const stages = {
      idle: 'Ready to start',
      starting: 'Initializing...',
      fetching: 'Fetching trends from database...',
      loading_model: 'Loading AI model...',
      computing_embeddings: 'Analyzing trends...',
      finding_duplicates: 'Finding duplicates...',
      deleting_duplicates: 'Removing duplicates...',
      completed: 'Deduplication complete!',
      error: 'An error occurred'
    };
    return stages[stage] || stage;
  };

  if (!isOpen) return null;

  const isRunning = status?.is_running;
  const isCompleted = status?.current_stage === 'completed';
  const hasError = status?.current_stage === 'error' || error;

  return (
    <div className="dedup-modal-overlay" onClick={hasError || isCompleted ? resetAndClose : undefined}>
      <div className="dedup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dedup-modal-header">
          <h2>Trend Deduplication</h2>
          {!isRunning && !isLoading && (
            <button className="dedup-close-btn" onClick={resetAndClose}>×</button>
          )}
        </div>

        <div className="dedup-modal-body">
          {!status || status.current_stage === 'idle' ? (
            <div className="dedup-start-view">
              <div className="dedup-info">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>This process will automatically identify and remove duplicate trends based on semantic similarity (90% or higher).</p>
                <ul>
                  <li>Trends are compared using AI-powered semantic analysis</li>
                  <li>The most complete trend is kept when duplicates are found</li>
                  <li>This process may take a few minutes</li>
                </ul>
              </div>
              {error && (
                <div className="dedup-error">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  {error}
                </div>
              )}
              <button
                className="dedup-start-btn"
                onClick={startDeduplication}
                disabled={isLoading}
              >
                {isLoading ? 'Starting...' : 'Start Deduplication'}
              </button>
            </div>
          ) : (
            <div className="dedup-progress-view">
              {/* Progress Stats */}
              <div className="dedup-stats">
                <div className="dedup-stat-card">
                  <div className="stat-value">{status.total_trends}</div>
                  <div className="stat-label">Total in Database</div>
                </div>
                <div className="dedup-stat-card">
                  <div className="stat-value">{status.duplicates_found}</div>
                  <div className="stat-label">Duplicate Pairs</div>
                </div>
                {status.duplicates_deleted > 0 && (
                  <div className="dedup-stat-card highlight">
                    <div className="stat-value">{status.duplicates_deleted}</div>
                    <div className="stat-label">Removed</div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isRunning && (
                <div className="dedup-progress-section">
                  <div className="dedup-progress-bar">
                    <div
                      className="dedup-progress-fill"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                  <div className="dedup-progress-text">
                    {status.progress}% • {getStageText(status.current_stage)}
                  </div>
                </div>
              )}

              {/* Completion Message */}
              {isCompleted && (
                <div className="dedup-complete">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h3>Deduplication Complete!</h3>
                  <p>
                    {status.duplicates_deleted > 0
                      ? `Successfully removed ${status.duplicates_deleted} duplicate trend${status.duplicates_deleted !== 1 ? 's' : ''} from ${status.total_trends} total trends in database.`
                      : `No duplicates were found among ${status.total_trends} trends.`}
                  </p>
                  {status.duplicates_deleted > 0 && (
                    <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '8px' }}>
                      Note: The dashboard only shows trends with complete descriptions.
                    </p>
                  )}
                  <button className="dedup-done-btn" onClick={resetAndClose}>
                    Done
                  </button>
                </div>
              )}

              {/* Error Message */}
              {hasError && (
                <div className="dedup-complete error">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  <h3>Error</h3>
                  <p>{status?.error || error}</p>
                  <button className="dedup-done-btn" onClick={resetAndClose}>
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeduplicationModal;
