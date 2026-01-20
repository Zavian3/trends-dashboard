import React, { useState, useEffect } from 'react';
import './StatsCards.css';

const StatsCards = ({ stats }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (expandedCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [expandedCard]);

  if (!stats) return null;

  const topCategories = Object.entries(stats.by_category || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const allCategories = Object.entries(stats.by_category || {})
    .sort((a, b) => b[1] - a[1]);

  const topDepartments = Object.entries(stats.by_department || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const allDepartments = Object.entries(stats.by_department || {})
    .sort((a, b) => b[1] - a[1]);

  const handleExpandCard = (cardType) => {
    setExpandedCard(cardType);
  };

  const handleCloseModal = () => {
    setExpandedCard(null);
  };

  return (
    <div className="stats-cards">
      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Top trends overall</h3>
          <button className="expand-btn" onClick={() => handleExpandCard('overview')}>⤢</button>
        </div>
        <div className="stats-card-content">
          <div className="stat-item">
            <span className="stat-label">Total Trends</span>
            <span className="stat-value">{stats.total_trends}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Impact</span>
            <span className="stat-value high">{stats.by_impact?.high || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Medium Impact</span>
            <span className="stat-value medium">{stats.by_impact?.medium || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Low Impact</span>
            <span className="stat-value low">{stats.by_impact?.low || 0}</span>
          </div>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Highest impact trends</h3>
          <button className="expand-btn" onClick={() => handleExpandCard('impact')}>⤢</button>
        </div>
        <div className="stats-card-content">
          {stats.highest_impact && stats.highest_impact.length > 0 ? (
            <div className="trends-list">
              {stats.highest_impact.map((trend, index) => (
                <div key={trend.id} className="trend-item">
                  <span className="trend-rank">{index + 1}</span>
                  <span className="trend-title">{trend.title}</span>
                  <span className="trend-score">{trend.impact_score}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>By Category</h3>
          <button className="expand-btn" onClick={() => handleExpandCard('category')}>⤢</button>
        </div>
        <div className="stats-card-content">
          {topCategories.length > 0 ? (
            <div className="chart-bars">
              {topCategories.map(([category, count]) => (
                <div key={category} className="bar-item">
                  <span className="bar-label">{category}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${(count / stats.total_trends) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>By Department</h3>
          <button className="expand-btn" onClick={() => handleExpandCard('department')}>⤢</button>
        </div>
        <div className="stats-card-content">
          {topDepartments.length > 0 ? (
            <div className="chart-bars">
              {topDepartments.map(([department, count]) => (
                <div key={department} className="bar-item">
                  <span className="bar-label">{department}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${(count / stats.total_trends) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>
      </div>

      {expandedCard && (
        <div className="stats-modal-overlay" onClick={handleCloseModal}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-header">
              <h2>
                {expandedCard === 'overview' && 'Top Trends Overview'}
                {expandedCard === 'impact' && 'Highest Impact Trends'}
                {expandedCard === 'category' && 'Trends by Category'}
                {expandedCard === 'department' && 'Trends by Department'}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <div className="stats-modal-content">
              {expandedCard === 'overview' && (
                <div className="overview-expanded">
                  <div className="stat-card-large">
                    <h3>Total Trends</h3>
                    <div className="stat-number">{stats.total_trends}</div>
                  </div>
                  <div className="impact-breakdown">
                    <h3>Impact Distribution</h3>
                    <div className="impact-items">
                      <div className="impact-item-large high">
                        <span className="impact-label-large">High Impact</span>
                        <span className="impact-count">{stats.by_impact?.high || 0}</span>
                        <span className="impact-percent">
                          {stats.total_trends > 0 
                            ? Math.round((stats.by_impact?.high || 0) / stats.total_trends * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="impact-item-large medium">
                        <span className="impact-label-large">Medium Impact</span>
                        <span className="impact-count">{stats.by_impact?.medium || 0}</span>
                        <span className="impact-percent">
                          {stats.total_trends > 0 
                            ? Math.round((stats.by_impact?.medium || 0) / stats.total_trends * 100) 
                            : 0}%
                        </span>
                      </div>
                      <div className="impact-item-large low">
                        <span className="impact-label-large">Low Impact</span>
                        <span className="impact-count">{stats.by_impact?.low || 0}</span>
                        <span className="impact-percent">
                          {stats.total_trends > 0 
                            ? Math.round((stats.by_impact?.low || 0) / stats.total_trends * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expandedCard === 'impact' && (
                <div className="impact-expanded">
                  {stats.highest_impact && stats.highest_impact.length > 0 ? (
                    <div className="trends-list-expanded">
                      {stats.highest_impact.map((trend, index) => (
                        <div key={trend.id} className="trend-item-expanded">
                          <div className="trend-rank-large">{index + 1}</div>
                          <div className="trend-info">
                            <div className="trend-title-large">{trend.title}</div>
                            <div className="trend-meta">
                              <span className="trend-category">{trend.category}</span>
                              <span className="trend-separator">•</span>
                              <span className="trend-department">{trend.department_name}</span>
                            </div>
                          </div>
                          <div className="trend-score-large">
                            <span className="score-number">{trend.impact_score}</span>
                            <span className="score-label">Impact</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No data available</p>
                  )}
                </div>
              )}

              {expandedCard === 'category' && (
                <div className="category-expanded">
                  {allCategories.length > 0 ? (
                    <div className="chart-bars-expanded">
                      {allCategories.map(([category, count]) => (
                        <div key={category} className="bar-item-expanded">
                          <span className="bar-label-large">{category}</span>
                          <div className="bar-container-large">
                            <div 
                              className="bar-fill-large" 
                              style={{ 
                                width: `${(count / stats.total_trends) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="bar-value-large">{count}</span>
                          <span className="bar-percent">
                            {Math.round((count / stats.total_trends) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No data available</p>
                  )}
                </div>
              )}

              {expandedCard === 'department' && (
                <div className="department-expanded">
                  {allDepartments.length > 0 ? (
                    <div className="chart-bars-expanded">
                      {allDepartments.map(([department, count]) => (
                        <div key={department} className="bar-item-expanded">
                          <span className="bar-label-large">{department}</span>
                          <div className="bar-container-large">
                            <div 
                              className="bar-fill-large" 
                              style={{ 
                                width: `${(count / stats.total_trends) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="bar-value-large">{count}</span>
                          <span className="bar-percent">
                            {Math.round((count / stats.total_trends) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No data available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCards;
