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

  const getTruncatedTitle = (title) => {
    if (!title) return '';
    return title.length > 70 ? title.substring(0, 70) + '...' : title;
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const formatTimeHorizon = (timeHorizon) => {
    if (!timeHorizon) return '';
    return timeHorizon.replace(/_/g, ' ');
  };

  const getStatusInfo = (status) => {
    if (status === 'draft') {
      return { label: 'Draft', class: 'draft' };
    }
    return { label: 'Confirmed', class: 'confirmed' };
  };

  const renderSkills = (skills) => {
    if (!skills || skills.length === 0) return '-';
    
    const skillsArray = Array.isArray(skills) ? skills : [skills];
    const firstSkill = skillsArray[0];
    const truncatedSkill = firstSkill && firstSkill.length > 10 
      ? firstSkill.substring(0, 10) + '...' 
      : firstSkill;
    
    if (skillsArray.length === 1) {
      return (
        <span className="skill-tag" title={firstSkill}>
          {truncatedSkill}
        </span>
      );
    }
    
    return (
      <div className="skills-wrapper">
        <span className="skill-tag" title={firstSkill}>
          {truncatedSkill}
        </span>
        <span className="skill-count">+{skillsArray.length - 1}</span>
      </div>
    );
  };

  const renderTrendRow = (trend) => {
    const impact = getImpactLabel(trend.impact_score || 0);
    const isSelected = selectedTrends.includes(trend.id);
    const status = getStatusInfo(trend.status);

    return (
      <tr 
        key={trend.id} 
        className={`trend-row ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          // Don't trigger row click if clicking checkbox
          if (!e.target.closest('.checkbox-cell')) {
            onTrendClick(trend);
          }
        }}
      >
        {isAdmin && (
          <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onTrendSelect(trend.id)}
            />
          </td>
        )}
        <td className="trend-title-cell">
          <div className="trend-title-wrapper">
            <span className="trend-title" title={trend.title}>
              {getTruncatedTitle(trend.title)}
            </span>
          </div>
        </td>
        <td className="category-cell">
          <span className="category-tag">{trend.category || '-'}</span>
        </td>
        <td className="department-cell">
          <span className="department-tag">{trend.department_name || '-'}</span>
        </td>
        
        {/* Admin-only columns */}
        {isAdmin && (
          <td className="status-cell">
            <span className={`status-badge ${status.class}`}>
              {status.label}
            </span>
          </td>
        )}
        {isAdmin && (
          <td className="impact-cell">
            <span className={`impact-badge ${impact.class}`}>
              {trend.impact_label || impact.label}
            </span>
          </td>
        )}
        
        {/* Non-admin columns */}
        {!isAdmin && (
          <td className="skills-cell">
            {renderSkills(trend.gevolgen_skills)}
          </td>
        )}
        {!isAdmin && (
          <td className="scope-cell">
            <span className="scope-tag">{capitalizeFirst(trend.scope) || '-'}</span>
          </td>
        )}
        {!isAdmin && (
          <td className="time-horizon-cell">
            <span className="time-horizon-tag">{formatTimeHorizon(trend.time_horizon) || '-'}</span>
          </td>
        )}
        
        <td className="expand-cell">
          <svg className="expand-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
            <div className="category-header">
              <div className="category-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="category-title">{category}</h3>
              <span className="category-count">
                {Object.values(subcategories).reduce((sum, subTrends) => sum + subTrends.length, 0)} trends
              </span>
            </div>
            {Object.entries(subcategories).map(([subCategory, subTrends]) => (
              <div key={subCategory} className="subcategory-group">
                <div className="subcategory-header">
                  <span className="subcategory-title">{subCategory}</span>
                  <span className="subcategory-count">{subTrends.length}</span>
                </div>
                <table className="trends-table trends-table-grouped">
                  <tbody>
                    {subTrends.map(renderTrendRow)}
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
              <th className="th-trend">
                <span className="th-content">Trend Title</span>
              </th>
              <th className="th-category">
                <span className="th-content">Category</span>
              </th>
              <th className="th-department">
                <span className="th-content">Sector</span>
              </th>
              
              {/* Admin-only columns */}
              {isAdmin && (
                <>
                  <th className="th-status">
                    <span className="th-content">Status</span>
                  </th>
                  <th className="th-impact">
                    <span className="th-content">Impact</span>
                  </th>
                </>
              )}
              
              {/* Non-admin columns */}
              {!isAdmin && (
                <>
                  <th className="th-skills">
                    <span className="th-content">Skills</span>
                  </th>
                  <th className="th-scope">
                    <span className="th-content">Scope</span>
                  </th>
                  <th className="th-time-horizon">
                    <span className="th-content">Time Horizon</span>
                  </th>
                </>
              )}
              
              <th className="th-expand"></th>
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
