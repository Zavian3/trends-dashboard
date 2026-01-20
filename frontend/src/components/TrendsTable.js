import React from 'react';
import Pagination from './Pagination';
import './TrendsTable.css';

const TrendsTable = ({ 
  trends, 
  loading, 
  onTrendClick, 
  viewMode, 
  isAdmin, 
  selectedTrends, 
  onTrendSelect,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange
}) => {
  if (loading) {
    return (
      <div className="trends-table-container">
        <div className="loading">Loading trends...</div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="trends-table-container">
        <div className="no-trends">No trends found</div>
      </div>
    );
  }

  const getImpactLabel = (score) => {
    if (score >= 7) return { label: 'High', class: 'high' };
    if (score >= 4) return { label: 'Medium', class: 'medium' };
    return { label: 'Low', class: 'low' };
  };

  // Check if all visible trends are selected
  const allVisibleSelected = trends.length > 0 && trends.every(trend => selectedTrends.includes(trend.id));
  const someVisibleSelected = trends.some(trend => selectedTrends.includes(trend.id)) && !allVisibleSelected;

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible trends
      trends.forEach(trend => {
        if (selectedTrends.includes(trend.id)) {
          onTrendSelect(trend.id);
        }
      });
    } else {
      // Select all visible trends
      trends.forEach(trend => {
        if (!selectedTrends.includes(trend.id)) {
          onTrendSelect(trend.id);
        }
      });
    }
  };

  const groupTrendsByCategory = (trends) => {
    const grouped = {};
    trends.forEach(trend => {
      const category = trend.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = {};
      }
      
      const subCategories = trend.sub_category || ['General'];
      subCategories.forEach(subCat => {
        if (!grouped[category][subCat]) {
          grouped[category][subCat] = [];
        }
        grouped[category][subCat].push(trend);
      });
    });
    return grouped;
  };

  const renderTrendRow = (trend) => {
    const impact = getImpactLabel(trend.impact_score || 0);
    const isSelected = selectedTrends.includes(trend.id);

    return (
      <tr 
        key={trend.id} 
        className={`trend-row ${isSelected ? 'selected' : ''}`}
      >
        {isAdmin && (
          <td className="checkbox-cell">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onTrendSelect(trend.id)}
              onClick={(e) => e.stopPropagation()}
            />
          </td>
        )}
        <td className="trend-title-cell">
          <div className="trend-title-content">
            <span className="trend-title">{trend.title}</span>
            {trend.status === 'draft' && (
              <span className="status-badge draft">Draft</span>
            )}
          </div>
        </td>
        <td className="category-cell">{trend.category}</td>
        <td className="department-cell">{trend.department_name}</td>
        <td className="impact-cell">
          <span className={`impact-badge ${impact.class}`}>
            {impact.label} ({trend.impact_score})
          </span>
        </td>
        <td className="actions-cell">
          <button 
            className="expand-btn-small"
            onClick={() => onTrendClick(trend)}
            title="View details"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </td>
      </tr>
    );
  };

  const renderGroupedView = () => {
    const grouped = groupTrendsByCategory(trends);
    
    return (
      <div className="grouped-view">
        {Object.entries(grouped).map(([category, subcategories]) => (
          <div key={category} className="category-group">
            <h3 className="category-header">{category}</h3>
            {Object.entries(subcategories).map(([subCategory, trends]) => (
              <div key={subCategory} className="subcategory-group">
                <h4 className="subcategory-header">{subCategory}</h4>
                <table className="trends-table">
                  <thead>
                    <tr>
                      {isAdmin && (
                        <th className="checkbox-header">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            ref={input => {
                              if (input) {
                                input.indeterminate = someVisibleSelected;
                              }
                            }}
                            onChange={handleSelectAll}
                            title={allVisibleSelected ? 'Deselect all on this page' : 'Select all on this page'}
                          />
                        </th>
                      )}
                      <th>Trend</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Impact</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map(renderTrendRow)}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="list-view">
        <table className="trends-table">
          <thead>
            <tr>
              {isAdmin && (
                <th className="checkbox-header">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someVisibleSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    title={allVisibleSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  />
                </th>
              )}
              <th>Trend</th>
              <th>Category</th>
              <th>Department</th>
              <th>Impact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trends.map(renderTrendRow)}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="trends-table-container">
      <div className="trends-content">
        {viewMode === 'grouped' ? renderGroupedView() : renderListView()}
      </div>
      
      {trends.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </div>
  );
};

export default TrendsTable;
