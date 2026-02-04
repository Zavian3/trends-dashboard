import React, { useState, useEffect } from 'react';
import './WorkplaceDevelopmentDetail.css';
import { getWorkplaceDevelopmentById, getWorkplaceDevelopmentsByTrend, getSkills } from '../utils/api';

const WorkplaceDevelopmentDetail = ({ developmentId, onClose, onDevelopmentClick }) => {
  const [development, setDevelopment] = useState(null);
  const [relatedDevelopments, setRelatedDevelopments] = useState([]);
  const [skillsWithTypes, setSkillsWithTypes] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const dev = data.workplace_development;
      setDevelopment(dev);
      
      // Fetch skills for this development with types
      try {
        const allSkillsData = await getSkills();
        const allSkills = allSkillsData.skills || [];
        
        // Get skills for this development
        const devSkillsData = await getSkills({ workplace_development_title: dev.title });
        const devSkills = devSkillsData.skills || [];
        
        // For each skill in this development, find its type and count occurrences
        const skillsInfo = devSkills.map(skillRecord => {
          const skillName = skillRecord.skill_name;
          const skillRecords = allSkills.filter(s => s.skill_name === skillName);
          const skillType = skillRecord.skill_type || 'general';
          
          return {
            name: skillName,
            type: skillType
          };
        });
        
        // Remove duplicates by skill name
        const uniqueSkills = [];
        const seenNames = new Set();
        skillsInfo.forEach(skill => {
          if (!seenNames.has(skill.name)) {
            seenNames.add(skill.name);
            uniqueSkills.push(skill);
          }
        });
        
        setSkillsWithTypes(uniqueSkills);
      } catch (err) {
        console.error('Error fetching skills:', err);
        setSkillsWithTypes([]);
      }
      
      // Fetch related developments
      if (dev.trend_title) {
        fetchRelatedDevelopments(dev.trend_title);
      }
    } catch (err) {
      console.error('Error fetching development details:', err);
      setError('Failed to load development details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedDevelopments = async (trendTitle) => {
    try {
      const data = await getWorkplaceDevelopmentsByTrend(trendTitle);
      
      // Filter out current development
      const related = data.workplace_developments
        .filter(dev => dev.id !== developmentId)
        .slice(0, 5);
      
      setRelatedDevelopments(related);
    } catch (err) {
      console.error('Error fetching related developments:', err);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const safeText = (text) => {
    if (!text) return 'Not available';
    return String(text);
  };

  const formatValue = (value) => {
    if (!value) return value;
    if (typeof value !== 'string') return value;
    return value.replace(/_/g, ' ');
  };

  // Count sources
  const countSources = (sources) => {
    if (!sources) return 0;
    if (typeof sources === 'string') {
      try {
        const parsed = JSON.parse(sources);
        return Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        return sources.split('\n').filter(s => s.trim()).length;
      }
    }
    if (Array.isArray(sources)) return sources.length;
    return 1;
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

  if (loading) {
    return (
      <div className="panel-overlay">
        <div className="slide-panel detail-panel">
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
      <div className="panel-overlay" onClick={handleOverlayClick}>
        <div className="slide-panel detail-panel">
          <div className="panel-header">
            <button className="panel-close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="error-panel">{error || 'Development not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-overlay" onClick={handleOverlayClick}>
      <div className="slide-panel detail-panel">
        {/* Header */}
        <div className="panel-header">
          <div className="panel-title-section">
            <h2>{development.title}</h2>
          </div>
          <button className="panel-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="panel-content">
          {/* 2. Description */}
          <div className="info-section">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <h3>Description</h3>
            </div>
            {renderDescriptionWithSources(development.description, development.sources)}
          </div>

          {/* 3. Sources List + Source Count Trend */}
          {development.sources && (
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
                  <span className="count-number">{countSources(development.sources)}</span>
                  <svg className="trend-indicator" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7V17M17 7H7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="sources-list">
                {(() => {
                  let sourcesArray = [];
                  if (typeof development.sources === 'string') {
                    try {
                      sourcesArray = JSON.parse(development.sources);
                    } catch {
                      sourcesArray = development.sources.split('\n').filter(s => s.trim());
                    }
                  } else if (Array.isArray(development.sources)) {
                    sourcesArray = development.sources;
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
          {development.workplace_example && (
            <div className="info-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 11h6M9 15h6M9 7h6" stroke="currentColor" strokeLinecap="round"/>
                </svg>
                <h3>Workplace Example</h3>
              </div>
              <p className="section-text">{safeText(development.workplace_example)}</p>
            </div>
          )}

          {/* 5. Two Cards: Short-term & Longer-term Change */}
          <div className="info-section">
            <div className="changes-grid">
              {development.short_term_change && (
                <div className="change-card short-term">
                  <div className="change-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div className="change-content">
                    <h4>Short-term Change</h4>
                    <p>{safeText(development.short_term_change)}</p>
                  </div>
                </div>
              )}
              {development.long_term_change && (
                <div className="change-card long-term">
                  <div className="change-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="change-content">
                    <h4>Longer-term Change</h4>
                    <p>{safeText(development.long_term_change)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. Brainport Impact (Regional Translation) */}
          {development.brainport_impact && (
            <div className="info-section highlight-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <h3>Impact for Brainport Region</h3>
              </div>
              <div className="highlight-content">
                <p>{safeText(development.brainport_impact)}</p>
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
              const lloData = development.lll_opportunities;
              
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
                    onClick={() => {
                      onDevelopmentClick && onDevelopmentClick(dev);
                    }}
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
    </div>
  );
};

export default WorkplaceDevelopmentDetail;
