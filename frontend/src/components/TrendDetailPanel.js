import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './TrendDetailPanel.css';

const TrendDetailPanel = ({ trend, onClose, isAdmin, onApprove, onDisapprove }) => {
  const { API_URL } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (trend) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [trend]);

  const getImpactLabel = (score) => {
    if (score >= 7) return { label: 'High', class: 'high' };
    if (score >= 4) return { label: 'Medium', class: 'medium' };
    return { label: 'Low', class: 'low' };
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

  const impact = getImpactLabel(trend.impact_score || 0);

  // Parse cijfers if it's a string
  const parseStatistics = (cijfers) => {
    if (!cijfers) return null;
    if (typeof cijfers === 'string') {
      try {
        return JSON.parse(cijfers);
      } catch (e) {
        return null;
      }
    }
    return cijfers;
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

  const statistics = parseStatistics(trend.cijfers);
  const sources = parseSources(trend.bronnen);

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="trend-detail-panel">
        <div className="panel-header">
          <div className="panel-header-top">
            <h2>{trend.title}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="panel-meta">
            <span className="meta-item">
              <strong>Category:</strong> {trend.category}
            </span>
            <span className="meta-item">
              <strong>Department:</strong> {trend.department_name}
            </span>
            <span className={`impact-badge ${impact.class}`}>
              {impact.label} Impact ({trend.impact_score})
            </span>
          </div>

          {isAdmin && trend.status === 'draft' && (
            <div className="admin-actions">
              <button className="btn-approve" onClick={handleApprove}>
                Approve
              </button>
              <button className="btn-disapprove" onClick={handleDisapprove}>
                Disapprove
              </button>
            </div>
          )}
        </div>

        <div className="panel-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          {isAdmin && (
            <button
              className={`tab-btn ${activeTab === 'descriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('descriptions')}
            >
              All Descriptions
            </button>
          )}
        </div>

        <div className="panel-content">
          {activeTab === 'details' ? (
            <>
              {trend.description && (
                <div className="content-section">
                  <h3>Description</h3>
                  <p>{trend.description}</p>
                </div>
              )}

              {trend.werkvloer_voorbeeld && (
                <div className="content-section">
                  <h3>Workplace Example</h3>
                  <p>{trend.werkvloer_voorbeeld}</p>
                </div>
              )}

              {trend.gevolgen_werk && (
                <div className="content-section">
                  <h3>Work Consequences</h3>
                  <p>{trend.gevolgen_werk}</p>
                </div>
              )}

              {trend.gevolgen_skills && trend.gevolgen_skills.length > 0 && (
                <div className="content-section">
                  <h3>Skills Consequences</h3>
                  <ul className="skills-list">
                    {trend.gevolgen_skills.map((skill, index) => (
                      <li key={index}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}

              {statistics && (
                <div className="content-section">
                  <h3>Statistics</h3>
                  <div className="statistics-container">
                    {typeof statistics === 'object' && !Array.isArray(statistics) ? (
                      Object.entries(statistics).map(([key, value]) => (
                        <div key={key} className="stat-item-box">
                          <div className="stat-item-header">
                            <span className="stat-item-label">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                          <div className="stat-item-value">{typeof value === 'object' ? JSON.stringify(value) : value}</div>
                        </div>
                      ))
                    ) : Array.isArray(statistics) ? (
                      statistics.map((stat, index) => (
                        <div key={index} className="stat-item-box">
                          {typeof stat === 'object' ? (
                            <>
                              <div className="stat-item-figure">{stat.figure || 'No data'}</div>
                              <div className="stat-item-footer">
                                {stat.source && (
                                  <span className="stat-item-source">{stat.source}</span>
                                )}
                                {stat.year && (
                                  <span className="stat-item-year">{stat.year}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="stat-item-figure">{stat}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="stat-text">{statistics}</p>
                    )}
                  </div>
                </div>
              )}

              {sources && sources.length > 0 && (
                <div className="content-section">
                  <h3>Sources</h3>
                  <div className="sources-list">
                    {sources.map((source, index) => (
                      <div key={index} className="source-item">
                        <div className="source-number">{index + 1}</div>
                        <div className="source-content">
                          {typeof source === 'object' ? (
                            <>
                              <div className="source-organization">
                                {source.organization || 'Unknown Organization'}
                                {source.reliability && (
                                  <span className={`reliability-badge ${source.reliability.toLowerCase()}`}>
                                    {source.reliability}
                                  </span>
                                )}
                              </div>
                              {source.url && (
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="source-link"
                                >
                                  {source.url}
                                </a>
                              )}
                              {source.year && (
                                <span className="source-year">Year: {source.year}</span>
                              )}
                            </>
                          ) : typeof source === 'string' ? (
                            source.startsWith('http') ? (
                              <a 
                                href={source} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="source-link"
                              >
                                {source}
                              </a>
                            ) : (
                              <span className="source-text">{source}</span>
                            )
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trend.regionale_vertaling && (
                <div className="content-section">
                  <h3>Regional Translation</h3>
                  <p>{trend.regionale_vertaling}</p>
                </div>
              )}

              {trend.llo_kansen && trend.llo_kansen.length > 0 && (
                <div className="content-section">
                  <h3>LLO Opportunities</h3>
                  <ul className="skills-list">
                    {trend.llo_kansen.map((kans, index) => (
                      <li key={index}>{kans}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="content-section">
                <h3>Additional Information</h3>
                <div className="info-grid">
                  {trend.time_horizon && (
                    <div className="info-item">
                      <strong>Time Horizon:</strong>
                      <span>{trend.time_horizon}</span>
                    </div>
                  )}
                  {trend.scope && (
                    <div className="info-item">
                      <strong>Scope:</strong>
                      <span>{trend.scope}</span>
                    </div>
                  )}
                  {trend.status && (
                    <div className="info-item">
                      <strong>Status:</strong>
                      <span className={`status-badge ${trend.status}`}>
                        {trend.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {trend.descriptions && (
                <>
                  <div className="content-section">
                    <h3>Internal Teacher Description</h3>
                    <p>{trend.descriptions.internal_teacher || 'No description available'}</p>
                  </div>

                  <div className="content-section">
                    <h3>Internal Business Description</h3>
                    <p>{trend.descriptions.internal_business || 'No description available'}</p>
                  </div>

                  <div className="content-section">
                    <h3>External User Description</h3>
                    <p>{trend.descriptions.external || 'No description available'}</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default TrendDetailPanel;
