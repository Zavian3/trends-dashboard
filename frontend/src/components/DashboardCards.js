import React, { useState, useEffect } from 'react';
import './DashboardCards.css';
import { getCardsOverview } from '../utils/api';

const DashboardCards = ({ filters, onTrendClick, onDevelopmentClick, onSkillClick }) => {
  const [cardsData, setCardsData] = useState({
    top_trends: [],
    quick_wins: [],
    trending_skills: []
  });
  const [loading, setLoading] = useState(true);
  const [modalCard, setModalCard] = useState(null); // null, 'trends', 'wins', 'skills'
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCardsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (modalCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalCard]);

  const fetchCardsData = async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      setLoading(true);
      setError(null);
      
      // Build query params from filters
      const params = {};
      if (filters.department_name && filters.department_name.length > 0) {
        params.department_name = filters.department_name;
      }
      
      const data = await getCardsOverview(params);
      setCardsData(data);
    } catch (err) {
      console.error('Error fetching cards data:', err);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying dashboard cards in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => fetchCardsData(retryCount + 1), delay);
        return;
      }
      
      setError('Failed to load dashboard cards');
    } finally {
      if (retryCount >= maxRetries || !error) {
        setLoading(false);
      }
    }
  };

  const renderTopTrendsCard = () => {
    const displayData = cardsData.top_trends.slice(0, 4);

    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Top Trends</h3>
            <p className="card-subtitle">Stable conversation starters</p>
          </div>
          <button 
            className="expand-btn"
            onClick={() => setModalCard('trends')}
          >
            Show More
          </button>
        </div>
        
        <div className="dashboard-card-content">
          {displayData.length === 0 ? (
            <div className="empty-state">No trends available</div>
          ) : (
            <div className="card-list">
              {displayData.map((trend, index) => (
                <div 
                  key={trend.id} 
                  className="card-item clickable"
                  onClick={() => onTrendClick && onTrendClick(trend)}
                >
                  <div className="card-item-number">{index + 1}</div>
                  <div className="card-item-content">
                    <div className="card-item-title">{trend.title}</div>
                  </div>
                  <div className="card-item-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuickWinsCard = () => {
    const displayData = cardsData.quick_wins.slice(0, 4);

    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Quick Wins</h3>
            <p className="card-subtitle">Immediate action items</p>
          </div>
          <button 
            className="expand-btn"
            onClick={() => setModalCard('wins')}
          >
            Show More
          </button>
        </div>
        
        <div className="dashboard-card-content">
          {displayData.length === 0 ? (
            <div className="empty-state">No quick wins available</div>
          ) : (
            <div className="card-list">
              {displayData.map((dev, index) => (
                <div 
                  key={dev.id} 
                  className="card-item clickable"
                  onClick={() => onDevelopmentClick && onDevelopmentClick(dev)}
                >
                  <div className="card-item-number">{index + 1}</div>
                  <div className="card-item-content">
                    <div className="card-item-title">{dev.title}</div>
                  </div>
                  <div className="card-item-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTrendingSkillsCard = () => {
    const displayData = cardsData.trending_skills.slice(0, 4);

    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Trending Skills</h3>
            <p className="card-subtitle">Skills becoming important now</p>
          </div>
          <button 
            className="expand-btn"
            onClick={() => setModalCard('skills')}
          >
            Show More
          </button>
        </div>
        
        <div className="dashboard-card-content">
          {displayData.length === 0 ? (
            <div className="empty-state">No trending skills available</div>
          ) : (
            <div className="card-list">
              {displayData.map((skill, index) => (
                <div 
                  key={`${skill.skill_name}-${index}`} 
                  className="card-item clickable"
                  onClick={() => onSkillClick && onSkillClick(skill)}
                >
                  <div className="card-item-number">{index + 1}</div>
                  <div className="card-item-content">
                    <div className="card-item-title">{skill.skill_name}</div>
                  </div>
                  <div className="card-item-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSavedItemsCard = () => {
    return (
      <div className="dashboard-card placeholder-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Saved Items</h3>
            <p className="card-subtitle">Bookmarked for later</p>
          </div>
        </div>
        
        <div className="dashboard-card-content">
          <div className="empty-state">
            <div className="empty-state-icon">📌</div>
            <p>Bookmark feature coming soon</p>
            <p className="empty-state-subtext">Save trends and developments for quick access</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-cards-container">
        <div className="dashboard-cards-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dashboard-card skeleton-card">
              <div className="skeleton-header"></div>
              <div className="skeleton-content"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-cards-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const renderModal = () => {
    if (!modalCard) return null;

    let title, subtitle, data;
    
    if (modalCard === 'trends') {
      title = 'Top Trends';
      subtitle = 'Stable conversation starters';
      data = cardsData.top_trends.slice(0, 20).map((trend, index) => (
        <div 
          key={trend.id} 
          className="modal-list-item clickable"
          onClick={() => { setModalCard(null); onTrendClick && onTrendClick(trend); }}
        >
          <div className="modal-item-number">{index + 1}</div>
          <div className="modal-item-content">
            <div className="modal-item-title">{trend.title}</div>
            <div className="modal-item-meta">
              <span className="badge badge-sector">{trend.department_name}</span>
              {trend.coverage_count > 0 && (
                <span className="meta-text">
                  {trend.coverage_count} development{trend.coverage_count !== 1 ? 's' : ''}
                </span>
              )}
              {trend.priority_score && (
                <span className="meta-text">Priority: {trend.priority_score.toFixed(1)}</span>
              )}
            </div>
          </div>
          <div className="modal-item-arrow">→</div>
        </div>
      ));
    } else if (modalCard === 'wins') {
      title = 'Quick Wins';
      subtitle = 'Immediate action items';
      data = cardsData.quick_wins.slice(0, 20).map((dev, index) => (
        <div 
          key={dev.id} 
          className="modal-list-item clickable"
          onClick={() => { setModalCard(null); onDevelopmentClick && onDevelopmentClick(dev); }}
        >
          <div className="modal-item-number">{index + 1}</div>
          <div className="modal-item-content">
            <div className="modal-item-title">{dev.title}</div>
            <div className="modal-item-meta">
              <span className={`badge badge-impact impact-${dev.impact_label?.toLowerCase().replace(' ', '-')}`}>
                {dev.impact_label}
              </span>
              <span className={`badge badge-effort effort-${dev.training_effort}`}>
                {dev.training_effort} effort
              </span>
              <span className={`badge badge-scope scope-${dev.scope}`}>{dev.scope}</span>
              {dev.quick_win_score && (
                <span className="meta-text">Score: {dev.quick_win_score.toFixed(1)}</span>
              )}
            </div>
          </div>
          <div className="modal-item-arrow">→</div>
        </div>
      ));
    } else if (modalCard === 'skills') {
      title = 'Trending Skills';
      subtitle = 'Skills becoming important now';
      data = cardsData.trending_skills.slice(0, 20).map((skill, index) => (
        <div 
          key={`${skill.skill_name}-${index}`} 
          className="modal-list-item clickable"
          onClick={() => { setModalCard(null); onSkillClick && onSkillClick(skill); }}
        >
          <div className="modal-item-number">{index + 1}</div>
          <div className="modal-item-content">
            <div className="modal-item-title">{skill.skill_name}</div>
            <div className="modal-item-meta">
              <span className={`badge badge-skill-type skill-${skill.skill_type.replace('_', '-')}`}>
                {skill.skill_type.replace('_', ' ')}
              </span>
              <span className="meta-text">
                {skill.occurrence_count} occurrence{skill.occurrence_count !== 1 ? 's' : ''}
              </span>
              {skill.skill_heat && (
                <span className="meta-text">Heat: {skill.skill_heat.toFixed(0)}</span>
              )}
            </div>
          </div>
          <div className="modal-item-arrow">→</div>
        </div>
      ));
    }

    return (
      <div className="cards-modal-overlay" onClick={() => setModalCard(null)}>
        <div className="cards-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cards-modal-header">
            <div>
              <h2>{title}</h2>
              <p className="cards-modal-subtitle">{subtitle}</p>
            </div>
            <button className="cards-modal-close" onClick={() => setModalCard(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="cards-modal-content">
            <div className="modal-list">
              {data}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="dashboard-cards-container">
        <div className="dashboard-cards-grid">
          {renderTopTrendsCard()}
          {renderQuickWinsCard()}
          {renderTrendingSkillsCard()}
          {renderSavedItemsCard()}
        </div>
      </div>
      
      {renderModal()}
    </>
  );
};

export default DashboardCards;
