import React, { useState, useEffect } from 'react';
import './GroupedTable.css';
import { getTrends, getTrendWorkplaceDevelopments } from '../utils/api';

const GroupedTable = ({ filters, sortBy, onDevelopmentClick }) => {
  const [trends, setTrends] = useState([]);
  const [expandedTrends, setExpandedTrends] = useState({});
  const [developmentsCache, setDevelopmentsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingDevelopments, setLoadingDevelopments] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

  const fetchTrends = async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = {};
      
      if (filters.department_name && filters.department_name.length > 0) {
        filters.department_name.forEach(dept => {
          params.department_name = [...(params.department_name || []), dept];
        });
      }
      
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(status => {
          params.status = [...(params.status || []), status];
        });
      }
      
      // Get all trends (no pagination for grouped view)
      params.limit = 100;
      
      const data = await getTrends(params);
      setTrends(data.trends || []);
    } catch (err) {
      console.error('Error fetching trends:', err);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying trends in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => fetchTrends(retryCount + 1), delay);
        return;
      }
      
      setError('Failed to load trends');
    } finally {
      if (retryCount >= maxRetries || !error) {
        setLoading(false);
      }
    }
  };

  const fetchDevelopments = async (trendId) => {
    if (developmentsCache[trendId]) {
      return;  // Already cached
    }

    try {
      setLoadingDevelopments(prev => ({ ...prev, [trendId]: true }));
      const data = await getTrendWorkplaceDevelopments(trendId);
      
      setDevelopmentsCache(prev => ({
        ...prev,
        [trendId]: data.workplace_developments || []
      }));
    } catch (err) {
      console.error('Error fetching developments:', err);
    } finally {
      setLoadingDevelopments(prev => ({ ...prev, [trendId]: false }));
    }
  };

  const toggleTrend = async (trendId) => {
    const isExpanded = expandedTrends[trendId];
    
    setExpandedTrends(prev => ({
      ...prev,
      [trendId]: !isExpanded
    }));

    // Fetch developments if expanding and not cached
    if (!isExpanded && !developmentsCache[trendId]) {
      await fetchDevelopments(trendId);
    }
  };

  const getPriorityScore = (dev) => {
    const impact = dev.impact_score || 0;
    const effortMap = { low: 1, medium: 2, high: 3 };
    const effort = effortMap[dev.training_effort] || 2;
    const urgencyFactor = dev.scope === 'regional' ? 1.5 : 1.2;
    return (impact * urgencyFactor) / effort;
  };

  const sortDevelopments = (developments) => {
    if (!developments) return [];
    
    const sorted = [...developments];
    
    switch (sortBy) {
      case 'impact':
        return sorted.sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
      case 'effort':
        const effortOrder = { low: 1, medium: 2, high: 3 };
        return sorted.sort((a, b) => 
          (effortOrder[a.training_effort] || 2) - (effortOrder[b.training_effort] || 2)
        );
      case 'priority':
      default:
        return sorted.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    }
  };

  const renderDevelopmentRow = (dev) => {
    return (
      <div 
        key={dev.id} 
        className="development-row"
        onClick={() => onDevelopmentClick && onDevelopmentClick(dev)}
      >
        <div className="development-content">
          <div className="development-title">{dev.title}</div>
          <div className="development-meta">
            <span className={`badge badge-impact impact-${dev.impact_label?.toLowerCase().replace(' ', '-')}`}>
              {dev.impact_label}
            </span>
            <span className={`badge badge-effort effort-${dev.training_effort}`}>
              {dev.training_effort} effort
            </span>
            <span className={`badge badge-time time-${dev.time_horizon}`}>
              {dev.time_horizon?.replace('_', ' ')}
            </span>
            <span className={`badge badge-scope scope-${dev.scope}`}>
              {dev.scope}
            </span>
            {sortBy === 'priority' && (
              <span className="priority-score">
                Priority: {getPriorityScore(dev).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="development-arrow">→</div>
      </div>
    );
  };

  const renderTrendRow = (trend) => {
    const isExpanded = expandedTrends[trend.id];
    const developments = developmentsCache[trend.id] || [];
    const isLoadingDevs = loadingDevelopments[trend.id];
    const sortedDevelopments = sortDevelopments(developments);

    return (
      <div key={trend.id} className={`trend-group ${isExpanded ? 'expanded' : ''}`}>
        <div className="trend-row" onClick={() => toggleTrend(trend.id)}>
          <div className="trend-expand-icon">
            {isExpanded ? '▼' : '▶'}
          </div>
          <div className="trend-content">
            <div className="trend-title">{trend.title}</div>
            <div className="trend-meta">
              <span className="badge badge-sector">{trend.department_name}</span>
              {trend.priority_score && (
                <span className="meta-text">Priority: {trend.priority_score.toFixed(1)}</span>
              )}
              {trend.momentum_score && (
                <span className="meta-text">Momentum: {trend.momentum_score.toFixed(1)}</span>
              )}
              <span className="meta-text development-count">
                {developments.length || '?'} development{developments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="developments-container">
            {isLoadingDevs ? (
              <div className="loading-developments">
                <div className="spinner"></div>
                <span>Loading developments...</span>
              </div>
            ) : sortedDevelopments.length === 0 ? (
              <div className="no-developments">
                No workplace developments found for this trend
              </div>
            ) : (
              <div className="developments-list">
                {sortedDevelopments.map(dev => renderDevelopmentRow(dev))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grouped-table-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading trends...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grouped-table-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="grouped-table-container">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No trends found</h3>
          <p>Try adjusting your filters to see more results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grouped-table-container">
      <div className="grouped-table">
        {trends.map(trend => renderTrendRow(trend))}
      </div>
    </div>
  );
};

export default GroupedTable;
