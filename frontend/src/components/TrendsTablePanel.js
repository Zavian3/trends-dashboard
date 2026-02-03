import React, { useState, useEffect } from 'react';
import './TrendsTablePanel.css';
import { getTrends, getWorkplaceDevelopments } from '../utils/api';

const TrendsTablePanel = ({ filters, sortBy, isAdmin }) => {
  const [trendsWithDevelopments, setTrendsWithDevelopments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevelopment, setSelectedDevelopment] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Helper function to safely render text fields
  const safeText = (value) => {
    if (!value) return 'Not available';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper to remove underscores and capitalize
  const formatValue = (value) => {
    if (!value) return value;
    if (typeof value !== 'string') return value;
    return value.replace(/_/g, ' ');
  };

  // Helper to parse impact breakdown
  const parseImpactBreakdown = (breakdown) => {
    if (!breakdown) return null;
    
    try {
      const parsed = typeof breakdown === 'string' ? JSON.parse(breakdown) : breakdown;
      return Object.entries(parsed).map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: `${value}/10`
      }));
    } catch (e) {
      return null;
    }
  };

  // Helper to format score as fraction
  const formatScore = (score, decimals = 1) => {
    if (!score && score !== 0) return 'N/A';
    const formatted = typeof score === 'number' ? score.toFixed(decimals) : score;
    return `${formatted}/10`;
  };

  // Helper function to parse sources and embed bubbles inline in description
  const renderDescriptionWithSources = (description, sources) => {
    if (!description) return <p className="section-text">Not available</p>;
    
    if (!sources || (Array.isArray(sources) && sources.length === 0)) {
      return <p className="section-text">{description}</p>;
    }

    // Parse sources array and handle both strings and objects
    let sourcesArray = [];
    if (typeof sources === 'string') {
      sourcesArray = sources.split(/[,\n]/).map(s => s.trim()).filter(s => s);
    } else if (Array.isArray(sources)) {
      sourcesArray = sources;
    } else {
      return <p className="section-text">{description}</p>;
    }

    if (sourcesArray.length === 0) {
      return <p className="section-text">{description}</p>;
    }

    // Split description into sentences
    const sentences = description.match(/[^.!?]+[.!?]+/g) || [description];
    const totalSentences = sentences.length;
    
    // Distribute sources throughout the description
    const elements = [];
    sentences.forEach((sentence, idx) => {
      elements.push(
        <span key={`text-${idx}`}>{sentence} </span>
      );
      
      // Insert source bubble after some sentences
      const sourceIndex = Math.floor((idx / totalSentences) * sourcesArray.length);
      if (sourceIndex < sourcesArray.length && idx < totalSentences - 1) {
        const source = sourcesArray[sourceIndex];
        let displayText = '';
        
        if (typeof source === 'string') {
          displayText = source;
        } else if (typeof source === 'object' && source !== null) {
          displayText = source.organization || source.title || source.url || `Source ${sourceIndex + 1}`;
        } else {
          displayText = `Source ${sourceIndex + 1}`;
        }

        elements.push(
          <span key={`bubble-${sourceIndex}`} className="source-bubble-inline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="bubble-number">{sourceIndex + 1}</span>
            <span className="source-tooltip">{displayText}</span>
          </span>
        );
      }
    });
    
    return (
      <p className="section-text description-with-inline-sources">
        {elements}
      </p>
    );
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [filters, sortBy]);

  useEffect(() => {
    fetchTrendsWithDevelopments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, page, pageSize]);

  // Lock body scroll when panels are open
  useEffect(() => {
    if (selectedDevelopment) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedDevelopment]);

  const fetchTrendsWithDevelopments = async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      setLoading(true);
      setError(null);
      
      const params = { 
        page: page,
        limit: pageSize 
      };
      
      // Apply all filters
      if (filters.department_name?.length > 0) {
        params.department_name = filters.department_name;
      }
      if (filters.status?.length > 0) {
        params.status = filters.status;
      }
      if (filters.category?.length > 0) {
        params.category = filters.category;
      }
      if (filters.impact_label?.length > 0) {
        params.impact_label = filters.impact_label;
      }
      if (filters.time_horizon?.length > 0) {
        params.time_horizon = filters.time_horizon;
      }
      if (filters.scope?.length > 0) {
        params.scope = filters.scope;
      }
      if (filters.training_effort?.length > 0) {
        params.training_effort = filters.training_effort;
      }
      
      // Fetch trends
      const trendsData = await getTrends(params);
      const trends = trendsData.trends || [];
      
      // Fetch developments for each trend
      const trendsWithDevs = await Promise.all(
        trends.map(async (trend) => {
          try {
            const devParams = { trend_title: trend.title };
            
            // Apply same filters to developments
            if (filters.category?.length > 0) devParams.category = filters.category;
            if (filters.impact_label?.length > 0) devParams.impact_label = filters.impact_label;
            if (filters.time_horizon?.length > 0) devParams.time_horizon = filters.time_horizon;
            if (filters.scope?.length > 0) devParams.scope = filters.scope;
            if (filters.training_effort?.length > 0) devParams.training_effort = filters.training_effort;
            
            const devData = await getWorkplaceDevelopments(devParams);
            return {
              ...trend,
              developments: devData.workplace_developments || []
            };
          } catch (err) {
            console.error(`Error fetching developments for trend ${trend.title}:`, err);
            return {
              ...trend,
              developments: []
            };
          }
        })
      );
      
      setTrendsWithDevelopments(trendsWithDevs);
      setTotal(trendsData.total || 0);
      setTotalPages(trendsData.total_pages || 1);
    } catch (err) {
      console.error('Error fetching trends:', err);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchTrendsWithDevelopments(retryCount + 1), delay);
        return;
      }
      
      setError('Failed to load trends');
    } finally {
      if (retryCount >= maxRetries || !error) {
        setLoading(false);
      }
    }
  };

  const handleDevelopmentClick = (development) => {
    setSelectedDevelopment(development);
  };

  const closeDetailPanel = () => {
    setSelectedDevelopment(null);
  };

  if (loading) {
    return (
      <div className="trends-table-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading trends...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trends-table-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (trendsWithDevelopments.length === 0) {
    return (
      <div className="trends-table-container">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No trends found</h3>
          <p>Try adjusting your filters to see more results</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="trends-table-container">
        <div className="trends-table">
          <div className="table-header">
            <div className="header-cell cell-index">#</div>
            <div className="header-cell cell-title">Trend Title</div>
            <div className="header-cell cell-sector">Sector</div>
            <div className="header-cell cell-priority">Priority</div>
            <div className="header-cell cell-momentum">Momentum</div>
            <div className="header-cell cell-developments">Developments</div>
          </div>
          
          <div className="table-body">
            {trendsWithDevelopments.map((trend, trendIndex) => (
              <React.Fragment key={trend.id}>
                {/* Trend Group Header */}
                <div className="group-header">
                  <div className="group-title">
                    <div className="group-color-bar"></div>
                    <h3>{trend.title}</h3>
                    <span className="group-count">{trend.developments?.length || 0}</span>
                  </div>
                  <div className="group-meta">
                    <span className="badge badge-sector">{trend.department_name}</span>
                    <span className="group-stats">
                      Priority: {trend.priority_score ? formatScore(trend.priority_score) : 'N/A'} • 
                      Momentum: {trend.momentum_score ? formatScore(trend.momentum_score) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Workplace Development Rows */}
                {trend.developments && trend.developments.length > 0 ? (
                  trend.developments.map((dev, devIndex) => (
                    <div
                      key={dev.id}
                      className="table-row development-row-item"
                      onClick={() => handleDevelopmentClick(dev)}
                    >
                      <div className="cell cell-index">{devIndex + 1}</div>
                      <div className="cell cell-title">
                        <div className="dev-title-text">{dev.title}</div>
                      </div>
                      <div className="cell cell-sector">
                        {dev.impact_label && (
                          <span className={`badge badge-impact impact-${dev.impact_label.toLowerCase().replace(' ', '-')}`}>
                            {formatValue(dev.impact_label)}
                          </span>
                        )}
                      </div>
                      <div className="cell cell-priority">
                        {dev.time_horizon && (
                          <span className={`badge badge-horizon horizon-${dev.time_horizon}`}>
                            {formatValue(dev.time_horizon)}
                          </span>
                        )}
                      </div>
                      <div className="cell cell-momentum">
                        {dev.scope && (
                          <span className={`badge badge-scope scope-${dev.scope}`}>
                            {formatValue(dev.scope)}
                          </span>
                        )}
                      </div>
                      <div className="cell cell-developments">
                        {dev.training_effort && (
                          <span className={`badge badge-effort effort-${dev.training_effort}`}>
                            {formatValue(dev.training_effort)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="group-empty">
                    No workplace developments found for this trend
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Pagination Controls */}
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {trendsWithDevelopments.length === 0 ? 0 : ((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total} trends
          </div>
          
          <div className="pagination-controls">
            <select 
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
            
            <button 
              className="pagination-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              ««
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              ‹
            </button>
            
            <span className="page-indicator">
              Page {page} of {totalPages}
            </span>
            
            <button 
              className="pagination-btn"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              ›
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              »»
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for development detail panel */}
      {selectedDevelopment && (
        <div 
          className="panel-overlay" 
          onClick={closeDetailPanel}
        />
      )}

      {/* Development Detail Panel */}
      {selectedDevelopment && (
        <div className="slide-panel detail-panel">
          <div className="panel-header">
            <div className="panel-title-section">
              <h2>{selectedDevelopment.title}</h2>
              <div className="detail-badges">
                <span className={`badge badge-impact impact-${selectedDevelopment.impact_label?.toLowerCase().replace(' ', '-')}`}>
                  {selectedDevelopment.impact_label}
                </span>
                <span className={`badge badge-effort effort-${selectedDevelopment.training_effort}`}>
                  {selectedDevelopment.training_effort} effort
                </span>
                <span className={`badge badge-scope scope-${selectedDevelopment.scope}`}>
                  {selectedDevelopment.scope}
                </span>
              </div>
            </div>
            <button className="panel-close" onClick={closeDetailPanel}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="panel-content">
            {/* Associated Trend */}
            {selectedDevelopment.trend_title && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <h3>Associated Trend</h3>
                </div>
                <div className="trend-link">{selectedDevelopment.trend_title}</div>
              </div>
            )}

            {/* Description with Sources */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <h3>Description</h3>
              </div>
              {renderDescriptionWithSources(selectedDevelopment.description, selectedDevelopment.sources)}
            </div>

            {/* Workplace Example */}
            {selectedDevelopment.workplace_example && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h3>Workplace Example</h3>
                </div>
                <p className="section-text">{safeText(selectedDevelopment.workplace_example)}</p>
              </div>
            )}

            {/* Changes Grid */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v6m0 6v6m8-8h-6m-4 0H4"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <h3>Change Timeline</h3>
              </div>
              <div className="changes-grid">
                {selectedDevelopment.short_term_change && (
                  <div className="change-card short-term">
                    <div className="change-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="change-content">
                      <h4>Short-term Change</h4>
                      <p>{safeText(selectedDevelopment.short_term_change)}</p>
                    </div>
                  </div>
                )}
                {selectedDevelopment.long_term_change && (
                  <div className="change-card long-term">
                    <div className="change-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <div className="change-content">
                      <h4>Long-term Change</h4>
                      <p>{safeText(selectedDevelopment.long_term_change)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <h3>Impact Analysis</h3>
              </div>
              <div className="metrics-grid">
                {selectedDevelopment.impact_score && (
                  <div className="metric-card">
                    <div className="metric-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Impact Score</span>
                      <span className="metric-value">{formatScore(selectedDevelopment.impact_score)}</span>
                    </div>
                  </div>
                )}
                {selectedDevelopment.impact_label && (
                  <div className="metric-card">
                    <div className="metric-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Impact Label</span>
                      <span className={`badge impact-${(selectedDevelopment.impact_label || 'medium').toLowerCase()}`}>
                        {formatValue(selectedDevelopment.impact_label) || 'Medium'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Impact Breakdown Parsed */}
              {parseImpactBreakdown(selectedDevelopment.impact_breakdown) && (
                <div className="impact-breakdown-section">
                  <h4 className="subsection-title">Impact Breakdown</h4>
                  <div className="impact-metrics-grid">
                    {parseImpactBreakdown(selectedDevelopment.impact_breakdown).map((metric, idx) => (
                      <div key={idx} className="metric-card-small">
                        <div className="metric-label-small">{metric.label}</div>
                        <div className="metric-value-large">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDevelopment.work_impact && (
                <div className="impact-description">
                  <p>{safeText(selectedDevelopment.work_impact)}</p>
                </div>
              )}
            </div>

            {/* Brainport Impact */}
            {selectedDevelopment.brainport_impact && (
              <div className="info-section highlight-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <h3>Impact for Brainport Region</h3>
                </div>
                <div className="highlight-content">
                  <p>{safeText(selectedDevelopment.brainport_impact)}</p>
                </div>
              </div>
            )}

            {/* LLO Opportunities */}
            {selectedDevelopment.llo_opportunities && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <h3>LLO Opportunities</h3>
                </div>
                <div className="opportunities-list">
                  {(() => {
                    if (typeof selectedDevelopment.llo_opportunities === 'string') {
                      return <div className="opportunity-item">{selectedDevelopment.llo_opportunities}</div>;
                    } else if (Array.isArray(selectedDevelopment.llo_opportunities)) {
                      return selectedDevelopment.llo_opportunities.map((opp, idx) => (
                        <div key={idx} className="opportunity-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>{typeof opp === 'string' ? opp : JSON.stringify(opp)}</span>
                        </div>
                      ));
                    } else {
                      return <div className="opportunity-item">{JSON.stringify(selectedDevelopment.llo_opportunities)}</div>;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Additional Metadata */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
                <h3>Additional Details</h3>
              </div>
              <div className="metadata-grid">
                {selectedDevelopment.time_horizon && (
                  <div className="metadata-item">
                    <span className="metadata-label">Time Horizon</span>
                    <span className={`badge badge-time time-${selectedDevelopment.time_horizon}`}>
                      {formatValue(selectedDevelopment.time_horizon)}
                    </span>
                  </div>
                )}
                {selectedDevelopment.training_effort && (
                  <div className="metadata-item">
                    <span className="metadata-label">Training Effort</span>
                    <span className={`badge badge-effort effort-${selectedDevelopment.training_effort}`}>
                      {formatValue(selectedDevelopment.training_effort)}
                    </span>
                  </div>
                )}
                {selectedDevelopment.scope && (
                  <div className="metadata-item">
                    <span className="metadata-label">Scope</span>
                    <span className={`badge badge-scope scope-${selectedDevelopment.scope}`}>
                      {formatValue(selectedDevelopment.scope)}
                    </span>
                  </div>
                )}
                {selectedDevelopment.concreteness_filters && (
                  <div className="metadata-item">
                    <span className="metadata-label">Concreteness</span>
                    <span className="metadata-value">{formatValue(safeText(selectedDevelopment.concreteness_filters))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sources */}
            {selectedDevelopment.sources && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <h3>Sources & References</h3>
                </div>
                <div className="sources-list">
                  {(() => {
                    // Handle sources being a string, array, or object
                    if (typeof selectedDevelopment.sources === 'string') {
                      return selectedDevelopment.sources.split(/[,\n]/).filter(s => s.trim()).map((source, idx) => (
                        <div key={idx} className="source-card">
                          <div className="source-number">{idx + 1}</div>
                          <div className="source-content">{source.trim()}</div>
                        </div>
                      ));
                    } else if (Array.isArray(selectedDevelopment.sources)) {
                      return selectedDevelopment.sources.map((source, idx) => {
                        if (typeof source === 'string') {
                          return (
                            <div key={idx} className="source-card">
                              <div className="source-number">{idx + 1}</div>
                              <div className="source-content">{source}</div>
                            </div>
                          );
                        } else if (typeof source === 'object') {
                          return (
                            <div key={idx} className="source-card">
                              <div className="source-number">{idx + 1}</div>
                              <div className="source-content">
                                {source.url ? (
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                                    {source.organization || source.title || source.url}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                      <polyline points="15 3 21 3 21 9"/>
                                      <line x1="10" y1="14" x2="21" y2="3"/>
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="source-text">{source.organization || source.title || 'Source'}</span>
                                )}
                                {source.year && <span className="source-meta">({source.year})</span>}
                                {source.reliability && (
                                  <span className={`badge badge-reliability reliability-${source.reliability.toLowerCase()}`}>
                                    {source.reliability}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      });
                    } else if (typeof selectedDevelopment.sources === 'object') {
                      const source = selectedDevelopment.sources;
                      return (
                        <div className="source-card">
                          <div className="source-number">1</div>
                          <div className="source-content">
                            {source.url ? (
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                                {source.organization || source.title || source.url}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </a>
                            ) : (
                              <span className="source-text">{source.organization || source.title || 'Source'}</span>
                            )}
                            {source.year && <span className="source-meta">({source.year})</span>}
                            {source.reliability && (
                              <span className={`badge badge-reliability reliability-${source.reliability.toLowerCase()}`}>
                                {source.reliability}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return <div className="empty-message">No sources available</div>;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TrendsTablePanel;
