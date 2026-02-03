import React, { useState, useEffect } from 'react';
import './WorkplaceDevelopmentDetail.css';
import { getWorkplaceDevelopmentById, getWorkplaceDevelopmentsByTrend } from '../utils/api';

const WorkplaceDevelopmentDetail = ({ developmentId, onClose, onDevelopmentClick }) => {
  const [development, setDevelopment] = useState(null);
  const [relatedDevelopments, setRelatedDevelopments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (developmentId) {
      fetchDevelopmentDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developmentId]);

  // Lock body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchDevelopmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getWorkplaceDevelopmentById(developmentId);
      setDevelopment(data.workplace_development);
      
      // Fetch related developments (same trend)
      if (data.workplace_development.trend_title) {
        fetchRelatedDevelopments(data.workplace_development.trend_title);
      } else {
        setLoadingRelated(false);
      }
    } catch (err) {
      console.error('Error fetching development details:', err);
      setError('Failed to load development details');
      setLoadingRelated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedDevelopments = async (trendTitle) => {
    try {
      setLoadingRelated(true);
      // For now, we'll need to get all trends and find the matching one
      // This is a workaround since we don't have a direct endpoint
      // In a real implementation, you'd want to optimize this
      const data = await getWorkplaceDevelopmentsByTrend(trendTitle);
      
      // Filter out current development
      const related = data.workplace_developments
        .filter(dev => dev.id !== developmentId)
        .slice(0, 5);
      
      setRelatedDevelopments(related);
    } catch (err) {
      console.error('Error fetching related developments:', err);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Helper function to safely render any field (could be string, object, or null)
  const safeRender = (field) => {
    if (!field) return 'Not available';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return JSON.stringify(field);
    return String(field);
  };

  const renderSkillBadge = (skill) => {
    const skillTypeClass = `skill-type-${skill.skill_type.replace('_', '-')}`;
    return (
      <div key={skill.id} className={`skill-badge ${skillTypeClass}`}>
        <span className="skill-name">{skill.skill_name}</span>
        <span className="skill-type">{skill.skill_type.replace('_', ' ')}</span>
      </div>
    );
  };

  const renderSources = () => {
    if (!development.sources) {
      return <p className="no-content">No sources available</p>;
    }

    // Handle sources being a string, array, or object
    let sourcesArray = [];
    
    if (typeof development.sources === 'string') {
      try {
        // Try to parse JSON string
        const parsed = JSON.parse(development.sources);
        sourcesArray = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not JSON, split by newlines
        sourcesArray = development.sources.split('\n').filter(s => s.trim()).map(s => ({ text: s }));
      }
    } else if (Array.isArray(development.sources)) {
      sourcesArray = development.sources;
    } else if (typeof development.sources === 'object') {
      // Single object - wrap in array
      sourcesArray = [development.sources];
    }

    if (sourcesArray.length === 0) {
      return <p className="no-content">No sources available</p>;
    }

    return (
      <div className="sources-list">
        {sourcesArray.map((source, index) => (
          <div key={index} className="source-item">
            <div className="source-icon">📎</div>
            <div className="source-content">
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                  {source.organization || source.title || source.url}
                </a>
              ) : (
                <span className="source-text">
                  {source.organization || source.title || source.text || `Source ${index + 1}`}
                </span>
              )}
              {(source.year || source.date) && (
                <span className="source-date">
                  {source.year || (source.date ? new Date(source.date).toLocaleDateString() : '')}
                </span>
              )}
              {source.reliability && (
                <span className="source-reliability"> • Reliability: {source.reliability}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLLOOpportunities = () => {
    if (!development.llo_opportunities) {
      return (
        <div className="llo-placeholder">
          <div className="placeholder-icon">💡</div>
          <p>Learning opportunities for this development are being identified</p>
        </div>
      );
    }

    // Handle llo_opportunities being a string or array
    let opportunitiesArray = [];
    
    if (typeof development.llo_opportunities === 'string') {
      opportunitiesArray = development.llo_opportunities.split('\n').filter(s => s.trim());
    } else if (Array.isArray(development.llo_opportunities)) {
      opportunitiesArray = development.llo_opportunities;
    }

    if (opportunitiesArray.length === 0) {
      return (
        <div className="llo-placeholder">
          <div className="placeholder-icon">💡</div>
          <p>Learning opportunities for this development are being identified</p>
        </div>
      );
    }

    return (
      <div className="llo-list">
        {opportunitiesArray.map((opportunity, index) => (
          <div key={index} className="llo-item">
            <div className="llo-bullet">•</div>
            <div className="llo-text">{typeof opportunity === 'string' ? opportunity : JSON.stringify(opportunity)}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="development-detail-overlay">
        <div className="development-detail-panel">
          <div className="loading-panel">
            <div className="spinner"></div>
            <p>Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !development) {
    return (
      <div className="development-detail-overlay" onClick={handleOverlayClick}>
        <div className="development-detail-panel">
          <div className="panel-header">
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="error-panel">{error || 'Development not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="development-detail-overlay" onClick={handleOverlayClick}>
      <div className="development-detail-panel">
        {/* Header */}
        <div className="panel-header">
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="panel-content">
          {/* 1. Title with badges */}
          <div className="detail-section title-section">
            <h2 className="development-title">{development.title}</h2>
            <div className="title-badges">
              <span className={`badge badge-impact impact-${development.impact_label?.toLowerCase().replace(' ', '-')}`}>
                {development.impact_label}
              </span>
              <span className={`badge badge-time time-${development.time_horizon}`}>
                {development.time_horizon?.replace('_', ' ')}
              </span>
              <span className={`badge badge-scope scope-${development.scope}`}>
                {development.scope}
              </span>
            </div>
          </div>

          {/* 2. Description */}
          <div className="detail-section">
            <h3 className="section-title">Description</h3>
            <p className="description-text">{safeRender(development.description)}</p>
          </div>

          {/* 3. Sources */}
          <div className="detail-section">
            <h3 className="section-title">Sources</h3>
            {renderSources()}
          </div>

          {/* 4. Workplace Example */}
          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">💼</span>
              Workplace Example
            </h3>
            <div className="example-card">
              <p>{safeRender(development.workplace_example)}</p>
            </div>
          </div>

          {/* 5. Two cards: Short-term & Long-term change */}
          <div className="detail-section">
            <h3 className="section-title">Changes Over Time</h3>
            <div className="changes-grid">
              <div className="change-card short-term-card">
                <div className="change-header">
                  <span className="change-icon">⚡</span>
                  <h4>Short-term</h4>
                </div>
                <p>{safeRender(development.short_term_change)}</p>
              </div>
              <div className="change-card long-term-card">
                <div className="change-header">
                  <span className="change-icon">🎯</span>
                  <h4>Long-term</h4>
                </div>
                <p>{safeRender(development.long_term_change)}</p>
              </div>
            </div>
          </div>

          {/* 6. Brainport Impact */}
          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">🌍</span>
              Impact for Brainport Region
            </h3>
            <div className="brainport-card">
              <p>{safeRender(development.brainport_impact)}</p>
            </div>
          </div>

          {/* 7. Skill Gaps */}
          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">🎓</span>
              Required Skills
            </h3>
            {development.skills && development.skills.length > 0 ? (
              <div className="skills-grid">
                {development.skills.map(skill => renderSkillBadge(skill))}
              </div>
            ) : (
              <p className="no-content">No skills specified</p>
            )}
          </div>

          {/* 8. LLO Opportunities */}
          <div className="detail-section">
            <h3 className="section-title">
              <span className="section-icon">📚</span>
              Learning Opportunities
            </h3>
            {renderLLOOpportunities()}
          </div>

          {/* 9. Related Developments */}
          <div className="detail-section">
            <h3 className="section-title">Related Developments</h3>
            {loadingRelated ? (
              <div className="loading-related">
                <div className="spinner-small"></div>
                <span>Loading...</span>
              </div>
            ) : relatedDevelopments.length > 0 ? (
              <div className="related-list">
                {relatedDevelopments.map(related => (
                  <div
                    key={related.id}
                    className="related-item"
                    onClick={() => {
                      onDevelopmentClick && onDevelopmentClick(related);
                    }}
                  >
                    <div className="related-content">
                      <div className="related-title">{related.title}</div>
                      <div className="related-meta">
                        <span className={`badge badge-impact impact-${related.impact_label?.toLowerCase().replace(' ', '-')}`}>
                          {related.impact_label}
                        </span>
                      </div>
                    </div>
                    <div className="related-arrow">→</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-content">No related developments found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceDevelopmentDetail;
