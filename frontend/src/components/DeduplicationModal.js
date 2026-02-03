import React, { useState, useEffect } from 'react';
import { startDeduplication, getDeduplicationStatus, resetDeduplicationStatus } from '../utils/api';
import './DeduplicationModal.css';

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
      const data = await getDeduplicationStatus();
      setStatus(data.status);

      // If completed, notify parent
      if (data.status.current_stage === 'completed' && data.status.completed_at) {
        setTimeout(() => {
          onComplete && onComplete(data.status);
        }, 2000);
      }
    } catch (err) {
      console.error('Error fetching deduplication status:', err);
    }
  };

  const handleStartDeduplication = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await startDeduplication(0.90);
      setStatus(data.status);
    } catch (err) {
      console.error('Error starting deduplication:', err);
      setError(err.response?.data?.error || 'Failed to start deduplication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetDeduplicationStatus();
      setStatus(null);
      setError(null);
    } catch (err) {
      console.error('Error resetting deduplication status:', err);
    }
  };

  const getStageLabel = (stage) => {
    const stageLabels = {
      idle: 'Ready',
      starting: 'Initializing...',
      fetching: 'Loading workplace developments...',
      computing_embeddings: 'Computing similarity...',
      finding_duplicates: 'Finding duplicates...',
      deleting_duplicates: 'Removing duplicates...',
      completed: 'Completed',
      error: 'Error'
    };
    return stageLabels[stage] || stage;
  };

  if (!isOpen) return null;

  return (
    <div className="deduplication-modal-overlay" onClick={onClose}>
      <div className="deduplication-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deduplication-modal-header">
          <h2>Workplace Development Deduplication</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="deduplication-modal-body">
          <p className="modal-description">
            This tool uses AI to identify and remove semantically similar workplace developments (90% similarity threshold).
            The process analyzes titles, descriptions, examples, and impact to find duplicates.
          </p>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {status && (
            <div className="status-container">
              <div className="status-header">
                <span className="status-label">{getStageLabel(status.current_stage)}</span>
                {status.is_running && (
                  <span className="status-running">Running...</span>
                )}
              </div>

              {status.progress > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${status.progress}%` }}
                  ></div>
                  <span className="progress-text">{status.progress}%</span>
                </div>
              )}

              <div className="status-details">
                <p className="status-detail">
                  <strong>Total Workplace Developments:</strong> {status.total_developments || 0}
                </p>
                <p className="status-detail">
                  <strong>Duplicate Pairs Found:</strong> {status.duplicates_found || 0}
                </p>
                <p className="status-detail">
                  <strong>Duplicates Removed:</strong> {status.duplicates_deleted || 0}
                </p>
              </div>

              {status.current_stage === 'completed' && (
                <div className="completion-message">
                  ✅ Deduplication completed successfully! Removed {status.duplicates_deleted} duplicate{status.duplicates_deleted !== 1 ? 's' : ''}.
                </div>
              )}

              {status.error && (
                <div className="error-message">{status.error}</div>
              )}
            </div>
          )}

          <div className="modal-info">
            <div className="info-icon">ℹ️</div>
            <div className="info-text">
              <strong>Note:</strong> This process uses graph clustering to identify and remove all duplicates in a single run. 
              The algorithm considers semantic meaning, not just exact text matches.
            </div>
          </div>
        </div>

        <div className="deduplication-modal-footer">
          {status?.current_stage === 'completed' ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={status?.is_running}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartDeduplication}
                disabled={isLoading || status?.is_running}
              >
                {isLoading || status?.is_running ? 'Running...' : 'Start Deduplication'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeduplicationModal;
