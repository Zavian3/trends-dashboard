import React, { useState, useEffect } from 'react';
import './WorkplaceDevelopmentsTable.css';
import { getWorkplaceDevelopments } from '../utils/api';

const WorkplaceDevelopmentsTable = ({ 
  filters, 
  sortBy, 
  onDevelopmentClick, 
  isAdmin,
  selectedDevelopments,
  onSelectionChange 
}) => {
  const [developments, setDevelopments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 0
  });

  useEffect(() => {
    fetchDevelopments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, pagination.page, pagination.limit]);

  const fetchDevelopments = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      // Add filters
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key].length > 0) {
          params[key] = filters[key];
        }
      });
      
      const data = await getWorkplaceDevelopments(params);
      setDevelopments(data.workplace_developments || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        total_pages: data.total_pages || 0
      }));
    } catch (err) {
      console.error('Error fetching workplace developments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(developments.map(dev => dev.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (developmentId) => {
    if (selectedDevelopments.includes(developmentId)) {
      onSelectionChange(selectedDevelopments.filter(id => id !== developmentId));
    } else {
      onSelectionChange([...selectedDevelopments, developmentId]);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const allSelected = developments.length > 0 && 
    developments.every(dev => selectedDevelopments.includes(dev.id));

  if (loading) {
    return (
      <div className="developments-table-container">
        <div className="table-loading">
          <div className="spinner"></div>
          <span>Loading developments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="developments-table-container">
      <div className="table-wrapper">
        <table className="developments-table">
          <thead>
            <tr>
              {isAdmin && (
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              <th>Title</th>
              <th>Category</th>
              <th>Impact</th>
              <th>Training Effort</th>
              <th>Time Horizon</th>
              <th>Scope</th>
              {isAdmin && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {developments.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="empty-row">
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>No workplace developments found</p>
                    <span>Try adjusting your filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              developments.map(dev => (
                <tr 
                  key={dev.id}
                  className={`table-row ${selectedDevelopments.includes(dev.id) ? 'selected' : ''}`}
                  onClick={(e) => {
                    if (e.target.type !== 'checkbox') {
                      onDevelopmentClick(dev);
                    }
                  }}
                >
                  {isAdmin && (
                    <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedDevelopments.includes(dev.id)}
                        onChange={() => handleSelectOne(dev.id)}
                      />
                    </td>
                  )}
                  <td className="title-col">
                    <div className="title-content">
                      {truncateText(dev.title, 60)}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-category">{dev.category}</span>
                  </td>
                  <td>
                    <span className={`badge badge-impact impact-${dev.impact_label?.toLowerCase().replace(' ', '-')}`}>
                      {dev.impact_label}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-effort effort-${dev.training_effort}`}>
                      {dev.training_effort}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-time">
                      {dev.time_horizon?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-scope scope-${dev.scope}`}>
                      {dev.scope}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <span className={`badge badge-status status-${dev.status}`}>
                        {dev.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-footer">
        <div className="pagination-info">
          Showing {developments.length > 0 ? ((pagination.page - 1) * pagination.limit + 1) : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
        </div>

        <div className="pagination-controls">
          <div className="page-size-selector">
            <label>Rows per page:</label>
            <select 
              value={pagination.limit} 
              onChange={(e) => handleLimitChange(e.target.value)}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="page-buttons">
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="page-btn"
            >
              ««
            </button>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="page-btn"
            >
              ‹
            </button>
            
            <span className="page-info">
              Page {pagination.page} of {pagination.total_pages || 1}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
              className="page-btn"
            >
              ›
            </button>
            <button
              onClick={() => handlePageChange(pagination.total_pages)}
              disabled={pagination.page >= pagination.total_pages}
              className="page-btn"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceDevelopmentsTable;
