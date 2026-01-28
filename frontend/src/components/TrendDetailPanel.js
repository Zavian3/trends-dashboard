import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './TrendDetailPanel.css';

const TrendDetailPanel = ({ trend, onClose, isAdmin, onApprove, onDisapprove }) => {
  const { API_URL } = useAuth();
  const [relatedTrends, setRelatedTrends] = useState([]);
  const [selectedTrendId, setSelectedTrendId] = useState(trend.id);
  const [currentTrend, setCurrentTrend] = useState(trend);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (currentTrend) {
      document.body.style.overflow = 'hidden';
      fetchRelatedTrends();
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrend]);

  const fetchRelatedTrends = async () => {
    setLoadingRelated(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/trends?category=${currentTrend.category}&sub_category=${currentTrend.sub_category?.[0] || ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Filter out current trend and limit to 3
      const filtered = response.data.trends
        .filter(t => t.id !== currentTrend.id)
        .slice(0, 3);
      setRelatedTrends(filtered);
    } catch (error) {
      console.error('Error fetching related trends:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleRelatedTrendClick = async (relatedTrendId) => {
    setLoadingRelated(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/trends/${relatedTrendId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setCurrentTrend(response.data.trend);
      setSelectedTrendId(relatedTrendId);
    } catch (error) {
      console.error('Error fetching related trend:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const getImpactLabel = (score) => {
    if (score >= 7) return { label: 'High', class: 'high' };
    if (score >= 4) return { label: 'Medium', class: 'medium' };
    return { label: 'Low', class: 'low' };
  };

  const formatTimeHorizon = (timeHorizon) => {
    if (!timeHorizon) return '';
    return timeHorizon.replace(/_/g, ' ');
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Insert sources inline into description - returns JSX elements
  const renderDescriptionWithSources = (text, sources) => {
    if (!text) return null;
    if (!sources || sources.length === 0) return <p className="description-text">{text}</p>;
    
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // If we have multiple sentences, insert sources between them
    if (sentences.length > 1) {
      const sourcesUsed = new Set();
      const elements = [];
      
      sentences.forEach((sentence, index) => {
        // Add the sentence text
        elements.push(
          <span key={`text-${index}`}>{sentence}</span>
        );
        
        // Try to insert a source after this sentence
        if (index < sentences.length - 1 && sources.length > sourcesUsed.size) {
          // Find a source we haven't used yet
          for (let i = 0; i < sources.length; i++) {
            if (!sourcesUsed.has(i)) {
              const source = sources[i];
              const sourceName = typeof source === 'object' 
                ? source.organization || 'Source' 
                : source.startsWith('http') ? 'Source' : source;
              const sourceUrl = typeof source === 'object' ? source.url : (source.startsWith('http') ? source : null);
              
              elements.push(
                <span key={`source-${i}`}>
                  {' '}
                  {sourceUrl ? (
                    <a 
                      href={sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-source-link"
                      title={`View source: ${sourceName}`}
                    >
                      ({sourceName})
                    </a>
                  ) : (
                    <span className="inline-source-text">({sourceName})</span>
                  )}
                  {' '}
                </span>
              );
              sourcesUsed.add(i);
              break;
            }
          }
        }
      });
      
      return <p className="description-text">{elements}</p>;
    }
    
    // If only one sentence or short text, add sources at the end
    const sourceElements = sources.map((source, index) => {
      const sourceName = typeof source === 'object' 
        ? source.organization || 'Source' 
        : source.startsWith('http') ? 'Source' : source;
      const sourceUrl = typeof source === 'object' ? source.url : (source.startsWith('http') ? source : null);
      
      return (
        <span key={`source-${index}`}>
          {index > 0 && ', '}
          {sourceUrl ? (
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-source-link"
              title={`View source: ${sourceName}`}
            >
              {sourceName}
            </a>
          ) : (
            <span className="inline-source-text">{sourceName}</span>
          )}
        </span>
      );
    });
    
    return (
      <p className="description-text">
        {text} ({sourceElements})
      </p>
    );
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/trends/${trend.id}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      onApprove();
      onClose();
    } catch (error) {
      console.error('Error approving trend:', error);
    }
  };

  const handleDisapprove = async () => {
    if (!window.confirm('Are you sure you want to delete this trend?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/trends/${trend.id}/disapprove`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      onDisapprove();
      onClose();
    } catch (error) {
      console.error('Error disapproving trend:', error);
    }
  };

  // Parse bronnen if it's a string
  const parseSources = (bronnen) => {
    if (!bronnen) return [];
    if (typeof bronnen === 'string') {
      try {
        return JSON.parse(bronnen);
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(bronnen)) return bronnen;
    return [];
  };

  const parseWorkConsequences = (gevolgenWerk) => {
    if (!gevolgenWerk) return [];
    // Split by newlines, bullet points, or numbers
    const items = gevolgenWerk.split(/[\n•\-\d+\.\)]/g)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    return items;
  };

  const impact = getImpactLabel(currentTrend.impact_score || 0);
  const sources = parseSources(currentTrend.bronnen);
  const workConsequences = parseWorkConsequences(currentTrend.gevolgen_werk);

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="trend-detail-panel">
        <div className="panel-header">
          <button className="close-btn" onClick={onClose}>×</button>
          
          <h1 className="panel-title">{currentTrend.title}</h1>
          
          <div className="panel-tags">
            <span className={`tag-badge impact-${impact.class}`}>
              {currentTrend.impact_label || impact.label} Impact
            </span>
            {currentTrend.time_horizon && (
              <span className="tag-badge time-badge">
                {formatTimeHorizon(currentTrend.time_horizon)}
              </span>
            )}
            {currentTrend.scope && (
              <span className="tag-badge scope-badge">
                {capitalizeWords(currentTrend.scope)}
              </span>
            )}
          </div>

          {isAdmin && currentTrend.status === 'draft' && (
            <div className="admin-actions">
              <button className="btn-approve" onClick={handleApprove}>
                Approve Trend
              </button>
              <button className="btn-disapprove" onClick={handleDisapprove}>
                Disapprove
              </button>
            </div>
          )}
        </div>

        <div className="panel-content">
          {/* Admin: All Descriptions */}
          {isAdmin && currentTrend.descriptions ? (
            <>
              <div className="content-block description-block">
                <h3 className="description-title">Internal Teacher Description</h3>
                {renderDescriptionWithSources(currentTrend.descriptions.internal_teacher, sources)}
              </div>

              <div className="content-block description-block">
                <h3 className="description-title">Internal Business Description</h3>
                {renderDescriptionWithSources(currentTrend.descriptions.internal_business, sources)}
              </div>

              <div className="content-block description-block">
                <h3 className="description-title">External Description</h3>
                {renderDescriptionWithSources(currentTrend.descriptions.external, sources)}
              </div>
            </>
          ) : currentTrend.description && (
            /* Non-Admin: Single Description with Sources */
            <div className="content-block description-block">
              {renderDescriptionWithSources(currentTrend.description, sources)}
            </div>
          )}

          {/* AI Reasoning */}
          {currentTrend.ai_reasoning && (
            <div className="content-block ai-reasoning-block">
              <div className="ai-reasoning-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 className="block-title">AI Analysis & Reasoning</h3>
              </div>
              <p className="ai-reasoning-text">{currentTrend.ai_reasoning}</p>
            </div>
          )}

          {/* Impact for Brainport Region */}
          {currentTrend.regionale_vertaling && (
            <div className="content-block regional-block">
              <div className="regional-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="regional-content">
                <h3 className="block-title">Impact for Brainport Region</h3>
                <p className="regional-text">{currentTrend.regionale_vertaling}</p>
              </div>
            </div>
          )}

          {/* Workplace & Consequences Side by Side */}
          {(currentTrend.werkvloer_voorbeeld || currentTrend.gevolgen_werk) && (
            <div className="dual-block-container">
              {/* Workplace Example */}
              {currentTrend.werkvloer_voorbeeld && (
                <div className="workplace-block">
                  <div className="block-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <h3 className="block-title">Workplace Example</h3>
                  </div>
                  <div className="workplace-content">
                    <p>{currentTrend.werkvloer_voorbeeld}</p>
                  </div>
                </div>
              )}

              {/* Work Consequences */}
              {currentTrend.gevolgen_werk && (
                <div className="consequences-block">
                  <div className="block-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="block-title">Work Consequences</h3>
                  </div>
                  <ul className="consequences-list">
                    {workConsequences.map((consequence, index) => (
                      <li key={index}>{consequence}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Skills Consequences */}
          {currentTrend.gevolgen_skills && currentTrend.gevolgen_skills.length > 0 && (
            <div className="content-block skills-block">
              <h3 className="block-title">Skills Consequences</h3>
              <div className="skills-grid">
                {currentTrend.gevolgen_skills.map((skill, index) => (
                  <div key={index} className="skill-card">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Related Trends */}
          <div className="content-block related-block">
            <h3 className="block-title">Related Trends</h3>
            {loadingRelated ? (
              <div className="related-trends-loader">
                <div className="spinner"></div>
                <p>Loading related trends...</p>
              </div>
            ) : relatedTrends.length > 0 ? (
              <div className="related-trends-grid">
                {relatedTrends.map((relatedTrend) => (
                  <div 
                    key={relatedTrend.id} 
                    className="related-trend-card"
                    onClick={() => handleRelatedTrendClick(relatedTrend.id)}
                  >
                    <h4 className="related-trend-title">{relatedTrend.title}</h4>
                    <div className="related-trend-meta">
                      <span className="related-meta-item">{relatedTrend.category}</span>
                      {relatedTrend.impact_label && (
                        <span className={`related-impact-badge impact-${getImpactLabel(relatedTrend.impact_score || 0).class}`}>
                          {relatedTrend.impact_label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-related-trends">No related trends found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TrendDetailPanel;
