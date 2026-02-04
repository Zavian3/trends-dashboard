import React, { useState, useEffect } from 'react';
import './TrendsTablePanel.css';
import { getTrends, getWorkplaceDevelopments, getSkills } from '../utils/api';

const TrendsTablePanel = ({ filters, sortBy, isAdmin }) => {
  const [trendsWithDevelopments, setTrendsWithDevelopments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevelopment, setSelectedDevelopment] = useState(null);
  const [relatedDevelopments, setRelatedDevelopments] = useState([]);
  const [skillsWithTypes, setSkillsWithTypes] = useState([]);

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

  // Render description with inline source bubbles
  const renderDescriptionWithSources = (description, sources) => {
    if (!description) return null;
    
    // Parse sources if it's a string
    let sourcesArray = [];
    if (typeof sources === 'string') {
      try {
        sourcesArray = JSON.parse(sources);
      } catch (e) {
        // If not JSON, split by comma or newline
        sourcesArray = sources.split(/[,\n]/).map(s => s.trim()).filter(s => s);
      }
    } else if (Array.isArray(sources)) {
      sourcesArray = sources;
    }
    
    if (!sourcesArray || sourcesArray.length === 0) {
      return <p className="section-text">{description}</p>;
    }

    // Regular expression to find source references like [1], [2], etc.
    const sourceRegex = /\[(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = sourceRegex.exec(description)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(description.substring(lastIndex, match.index));
      }

      // Add the source bubble
      const sourceIndex = parseInt(match[1], 10) - 1;
      if (sourceIndex >= 0 && sourceIndex < sourcesArray.length) {
        const source = sourcesArray[sourceIndex];
        const sourceData = typeof source === 'string' ? { organization: source, url: source } : source;
        
        parts.push(
          <span key={`source-${match.index}`} className="source-bubble" title={sourceData.organization || sourceData.title || sourceData.url}>
            {match[1]}
            <span className="source-tooltip">
              <div className="source-tooltip-content">
                <div className="source-tooltip-header">
                  {sourceData.organization || sourceData.title || 'Source'}
                </div>
                <div className="source-tooltip-body">
                  {sourceData.year && <p className="source-tooltip-meta">Year: {sourceData.year}</p>}
                  {sourceData.reliability && <p className="source-tooltip-meta">Reliability: {sourceData.reliability}</p>}
                  {sourceData.description && <p>{sourceData.description}</p>}
                </div>
                {sourceData.url && (
                  <a 
                    href={sourceData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-tooltip-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Source →
                  </a>
                )}
              </div>
            </span>
          </span>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < description.length) {
      parts.push(description.substring(lastIndex));
    }

    return <p className="section-text">{parts}</p>;
  };

  // Helper to render impact as progress bar
  const renderImpactBar = (impactScore) => {
    if (!impactScore && impactScore !== 0) return <span className="impact-bar-empty">N/A</span>;
    
    const percentage = (impactScore / 10) * 100;
    let colorClass = 'low';
    if (percentage >= 75) colorClass = 'very-high';
    else if (percentage >= 50) colorClass = 'high';
    else if (percentage >= 25) colorClass = 'medium';
    
    return (
      <div className="impact-bar-container">
        <div className="impact-bar-background">
          <div 
            className={`impact-bar-fill impact-${colorClass}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Helper to render effort level indicators
  const renderEffortIndicators = (effortLevel) => {
    if (!effortLevel) return <span className="effort-empty">N/A</span>;
    
    const level = effortLevel.toLowerCase();
    const levels = ['low', 'medium', 'high'];
    const activeIndex = levels.indexOf(level);
    
    return (
      <div className="effort-indicators">
        {levels.map((l, index) => (
          <div 
            key={l}
            className={`effort-indicator ${index <= activeIndex ? `active effort-${level}` : 'inactive'}`}
          ></div>
        ))}
      </div>
    );
  };

  // Helper to parse and count sources
  const countSources = (sources) => {
    if (!sources) return 0;
    if (typeof sources === 'string') {
      const parsed = sources.split(/[,\n]/).map(s => s.trim()).filter(s => s);
      return parsed.length;
    }
    if (Array.isArray(sources)) {
      return sources.length;
    }
    return 0;
  };

  // Helper function to parse sources and embed bubbles inline in description
  useEffect(() => {
    fetchTrendsWithDevelopments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

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
        limit: 1000  // Fetch all trends (high limit)
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
            const devParams = { 
              trend_title: trend.title,
              limit: 1000  // Fetch ALL developments for this trend
            };
            
            // Apply same filters to developments
            if (filters.category?.length > 0) devParams.category = filters.category;
            if (filters.impact_label?.length > 0) devParams.impact_label = filters.impact_label;
            if (filters.time_horizon?.length > 0) devParams.time_horizon = filters.time_horizon;
            if (filters.scope?.length > 0) devParams.scope = filters.scope;
            if (filters.training_effort?.length > 0) devParams.training_effort = filters.training_effort;
            
            const devData = await getWorkplaceDevelopments(devParams);
            const developments = devData.workplace_developments || [];
            
            return {
              ...trend,
              developments: developments
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
      
      // Fetch all skills in one batch
      try {
        const allSkillsData = await getSkills();
        const allSkills = allSkillsData.skills || [];
        
        console.log(`DEBUG: Fetched ${allSkills.length} total skills from database`);
        
        // Create a map of development title -> skills
        const skillsMap = {};
        allSkills.forEach(skill => {
          const devTitle = skill.workplace_development_title;
          if (!skillsMap[devTitle]) {
            skillsMap[devTitle] = [];
          }
          skillsMap[devTitle].push(skill.skill_name);
        });
        
        console.log(`DEBUG: Skills mapped to ${Object.keys(skillsMap).length} workplace developments`);
        console.log('DEBUG: Sample skills map:', Object.keys(skillsMap).slice(0, 3).map(key => ({ 
          title: key, 
          skills: skillsMap[key] 
        })));
        
        // Associate skills with developments
        const trendsWithSkills = trendsWithDevs.map(trend => ({
          ...trend,
          developments: trend.developments.map(dev => ({
            ...dev,
            skills: skillsMap[dev.title] || []
          }))
        }));
        
        setTrendsWithDevelopments(trendsWithSkills);
      } catch (err) {
        console.error('Error fetching skills:', err);
        setTrendsWithDevelopments(trendsWithDevs);
      }
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

  const handleDevelopmentClick = async (development) => {
    setSelectedDevelopment(development);
    
    // Fetch related developments (same trend)
    if (development.trend_title) {
      try {
        const devData = await getWorkplaceDevelopments({ 
          trend_title: development.trend_title,
          limit: 100
        });
        const related = devData.workplace_developments
          .filter(dev => dev.id !== development.id)
          .slice(0, 5);
        setRelatedDevelopments(related);
      } catch (err) {
        console.error('Error fetching related developments:', err);
        setRelatedDevelopments([]);
      }
    }
    
    // Fetch skills with types and occurrence counts
    if (development.skills && development.skills.length > 0) {
      try {
        const allSkillsData = await getSkills();
        const allSkills = allSkillsData.skills || [];
        
        // For each skill in this development, find its type and count occurrences
        const skillsInfo = development.skills.map(skillName => {
          const skillRecords = allSkills.filter(s => s.skill_name === skillName);
          const skillType = skillRecords[0]?.skill_type || 'general';
          const occurrenceCount = new Set(skillRecords.map(s => s.workplace_development_title)).size;
          
          return {
            name: skillName,
            type: skillType,
            occurrences: occurrenceCount
          };
        });
        
        setSkillsWithTypes(skillsInfo);
      } catch (err) {
        console.error('Error fetching skills info:', err);
        setSkillsWithTypes(development.skills.map(name => ({ name, type: 'general', occurrences: 1 })));
      }
    } else {
      setSkillsWithTypes([]);
    }
  };

  const closeDetailPanel = () => {
    setSelectedDevelopment(null);
    setRelatedDevelopments([]);
    setSkillsWithTypes([]);
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
            <div className="header-cell cell-title">Title</div>
            <div className="header-cell cell-impact">Impact</div>
            <div className="header-cell cell-effort">Effort Level</div>
            <div className="header-cell cell-horizon">Time Horizon</div>
            <div className="header-cell cell-skills">Skills</div>
            <div className="header-cell cell-sources">Sources</div>
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
                      Momentum: {trend.momentum_score ? formatScore(trend.momentum_score) : 'N/A'} • 
                      Added Since Last Cycle: 
                      <span className="recent-additions">
                        {trend.recent_additions_count || 0}
                        {trend.recent_additions_count > 0 && (
                          <svg className="trend-up-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 19V5M12 5L5 12M12 5l7 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
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
                      
                      {/* Title */}
                      <div className="cell cell-title">
                        <div className="dev-title-text">{dev.title}</div>
                      </div>
                      
                      {/* Impact (Progress Bar) */}
                      <div className="cell cell-impact">
                        {renderImpactBar(dev.impact_score)}
                      </div>
                      
                      {/* Effort Level (Indicators) */}
                      <div className="cell cell-effort">
                        {renderEffortIndicators(dev.training_effort)}
                      </div>
                      
                      {/* Time Horizon */}
                      <div className="cell cell-horizon">
                        {dev.time_horizon ? (
                          <span className={`badge badge-horizon horizon-${dev.time_horizon}`}>
                            {formatValue(dev.time_horizon)}
                          </span>
                        ) : (
                          <span className="cell-empty">N/A</span>
                        )}
                      </div>
                      
                      {/* Skills */}
                      <div className="cell cell-skills">
                        {dev.skills && dev.skills.length > 0 ? (
                          <div className="skills-tags">
                            {dev.skills.slice(0, 2).map((skill, idx) => (
                              <span key={idx} className="skill-tag">{skill}</span>
                            ))}
                            {dev.skills.length > 2 && (
                              <span className="skill-more">+{dev.skills.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="cell-empty">No skills</span>
                        )}
                      </div>
                      
                      {/* Sources (Count) */}
                      <div className="cell cell-sources">
                        <div className="sources-count">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>{countSources(dev.sources)}</span>
                        </div>
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
        
        {/* Results Summary */}
        <div className="results-summary">
          Showing {trendsWithDevelopments.length} trends with {trendsWithDevelopments.reduce((sum, t) => sum + (t.developments?.length || 0), 0)} workplace developments
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
            </div>
            <button className="panel-close" onClick={closeDetailPanel}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="panel-content">
            {/* 1. Title (already in header) */}
            
            {/* 2. Description */}
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

            {/* 3. Sources List + Source Count Trend */}
            {selectedDevelopment.sources && (
              <div className="info-section">
                <div className="section-header-row">
                  <div className="section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <h3>Sources</h3>
                  </div>
                  <div className="source-count-badge">
                    <span className="count-number">{countSources(selectedDevelopment.sources)}</span>
                    <svg className="trend-indicator" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M7 17L17 7M17 7V17M17 7H7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="sources-list">
                  {(() => {
                    let sourcesArray = [];
                    if (typeof selectedDevelopment.sources === 'string') {
                      try {
                        sourcesArray = JSON.parse(selectedDevelopment.sources);
                      } catch {
                        sourcesArray = selectedDevelopment.sources.split('\n').filter(s => s.trim());
                      }
                    } else if (Array.isArray(selectedDevelopment.sources)) {
                      sourcesArray = selectedDevelopment.sources;
                    }
                    
                    return sourcesArray.map((source, idx) => {
                      const sourceData = typeof source === 'string' ? { organization: source, url: source } : source;
                      const hasUrl = sourceData.url && sourceData.url.trim() !== '';
                      
                      const content = (
                        <>
                          <div className="source-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                          </div>
                          <div className="source-content">
                            <div className="source-organization">
                              {sourceData.organization || sourceData.title || `Source ${idx + 1}`}
                            </div>
                            {(sourceData.year || sourceData.reliability) && (
                              <div className="source-meta">
                                {sourceData.year && <span className="source-year">{sourceData.year}</span>}
                                {sourceData.reliability && (
                                  <span className={`source-reliability reliability-${sourceData.reliability.toLowerCase()}`}>
                                    {sourceData.reliability}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {hasUrl && (
                            <svg className="source-link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          )}
                        </>
                      );
                      
                      if (hasUrl) {
                        return (
                          <a 
                            key={idx} 
                            href={sourceData.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="source-item clickable"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {content}
                          </a>
                        );
                      } else {
                        return (
                          <div key={idx} className="source-item">
                            {content}
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            )}

            {/* 4. Workplace Example */}
            {selectedDevelopment.workplace_example && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 11h6M9 15h6M9 7h6" stroke="currentColor" strokeLinecap="round"/>
                  </svg>
                  <h3>Workplace Example</h3>
                </div>
                <p className="section-text">{safeText(selectedDevelopment.workplace_example)}</p>
              </div>
            )}

            {/* 5. Two Cards: Short-term & Longer-term Change */}
            <div className="info-section">
              <div className="changes-grid">
                {selectedDevelopment.short_term_change && (
                  <div className="change-card short-term">
                    <div className="change-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
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
                      <h4>Longer-term Change</h4>
                      <p>{safeText(selectedDevelopment.long_term_change)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Brainport Impact (Regional Translation) */}
            {selectedDevelopment.brainport_impact && (
              <div className="info-section highlight-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  <h3>Impact for Brainport Region</h3>
                </div>
                <div className="highlight-content">
                  <p>{safeText(selectedDevelopment.brainport_impact)}</p>
                </div>
              </div>
            )}

            {/* 7. Skill Gaps (Canonical Skills + Type Tags) */}
            {skillsWithTypes.length > 0 && (
              <div className="info-section">
                <div className="section-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                  <h3>Skill Gaps</h3>
                </div>
                <div className="modern-skills-container">
                  {skillsWithTypes.map((skill, idx) => {
                    const skillTypeSlug = skill.type.replace(/\s+/g, '-').toLowerCase();
                    return (
                      <div key={idx} className={`modern-skill-pill skill-pill-${skillTypeSlug}`}>
                        <div className="skill-pill-icon">
                          {skillTypeSlug.includes('soft') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('hard') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('digital') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('compliance') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('technical') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="16 18 22 12 16 6"/>
                              <polyline points="8 6 2 12 8 18"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('leadership') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                              <path d="M2 17l10 5 10-5"/>
                              <path d="M2 12l10 5 10-5"/>
                            </svg>
                          )}
                          {skillTypeSlug.includes('communication') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          )}
                          {!skillTypeSlug.includes('soft') && !skillTypeSlug.includes('hard') && 
                           !skillTypeSlug.includes('digital') && !skillTypeSlug.includes('compliance') &&
                           !skillTypeSlug.includes('technical') && !skillTypeSlug.includes('leadership') &&
                           !skillTypeSlug.includes('communication') && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 16v-4"/>
                              <path d="M12 8h.01"/>
                            </svg>
                          )}
                        </div>
                        <div className="skill-pill-content">
                          <span className="skill-pill-name">{skill.name}</span>
                          <span className="skill-pill-type">{formatValue(skill.type)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. LLO Opportunities */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <h3>LLO Opportunities</h3>
              </div>
              {(() => {
                // Use the correct column name: lll_opportunities (with 3 L's)
                const lloData = selectedDevelopment.lll_opportunities;
                
                if (!lloData || 
                    lloData === '' ||
                    lloData === 'null' ||
                    lloData === '[]' ||
                    (Array.isArray(lloData) && lloData.length === 0)) {
                  return (
                    <div className="llo-placeholder">
                      <div className="placeholder-icon">💡</div>
                      <p>Learning opportunities for this development are being identified</p>
                    </div>
                  );
                }

                let opportunities = lloData;
                
                // Parse if it's a JSON string
                if (typeof opportunities === 'string') {
                  try {
                    opportunities = JSON.parse(opportunities);
                  } catch (e) {
                    // If parsing fails, split by comma or newline
                    opportunities = opportunities.split(/[,\n]/).map(s => s.trim()).filter(s => s);
                    if (opportunities.length === 0) {
                      opportunities = [lloData];
                    }
                  }
                }
                
                // Ensure it's an array
                if (!Array.isArray(opportunities)) {
                  opportunities = [opportunities];
                }

                if (opportunities.length === 0) {
                  return (
                    <div className="llo-placeholder">
                      <div className="placeholder-icon">💡</div>
                      <p>Learning opportunities for this development are being identified</p>
                    </div>
                  );
                }
                
                // Render array of opportunities
                return (
                  <div className="llo-opportunities-list">
                    {opportunities.map((opp, idx) => (
                      <div key={idx} className="llo-opportunity-card">
                        <div className="llo-opportunity-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                          </svg>
                        </div>
                        <span className="llo-opportunity-text">
                          {typeof opp === 'string' ? opp : (opp.title || opp.name || JSON.stringify(opp))}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 9. Related Workplace Developments */}
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <h3>Related Workplace Developments</h3>
              </div>
              {relatedDevelopments.length > 0 ? (
                <div className="related-developments-list">
                  {relatedDevelopments.map((dev) => (
                    <div 
                      key={dev.id} 
                      className="related-development-item"
                      onClick={() => handleDevelopmentClick(dev)}
                    >
                      <div className="related-dev-content">
                        <div className="related-dev-title">{dev.title}</div>
                        {dev.impact_label && (
                          <span className={`badge impact-${dev.impact_label.toLowerCase().replace(/\s+/g, '-')}`}>
                            {formatValue(dev.impact_label)}
                          </span>
                        )}
                      </div>
                      <svg className="related-dev-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-content">No related developments found</p>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default TrendsTablePanel;
