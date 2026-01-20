import React from 'react';
import './Filters.css';

const Filters = ({ 
  filters, 
  onFilterChange, 
  departments, 
  categories, 
  subcategories,
  viewMode,
  onViewModeChange,
  isAdmin 
}) => {
  const handleChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const clearFilter = (field) => {
    onFilterChange({ [field]: '' });
  };

  const filteredCategories = filters.department_name
    ? categories.filter(cat => cat.department === filters.department_name)
    : categories;

  const filteredSubcategories = filters.category
    ? subcategories.filter(sub => sub.category_name === filters.category)
    : subcategories;

  return (
    <div className="filters-container">
      <div className="filters-header">
        <span className="filters-label">Filters</span>
      </div>

      <div className="filters-row">
        {isAdmin && (
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="filter-select filter-status"
            >
              <option value="">All Trends</option>
              <option value="draft">Draft (Pending Approval)</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
        )}

        <div className="filter-group">
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">Category</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.category_name}>
                {cat.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.sub_category}
            onChange={(e) => handleChange('sub_category', e.target.value)}
            className="filter-select"
          >
            <option value="">Subcategory</option>
            {filteredSubcategories.map(sub => (
              <option key={sub.id} value={sub.sub_category_name}>
                {sub.sub_category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.department_name}
            onChange={(e) => handleChange('department_name', e.target.value)}
            className="filter-select"
          >
            <option value="">Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.time_horizon}
            onChange={(e) => handleChange('time_horizon', e.target.value)}
            className="filter-select"
          >
            <option value="">Time Horizon</option>
            <option value="short">Short term</option>
            <option value="medium">Medium term</option>
            <option value="long">Long term</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.scope}
            onChange={(e) => handleChange('scope', e.target.value)}
            className="filter-select"
          >
            <option value="">Scope</option>
            <option value="local">Local</option>
            <option value="regional">Regional</option>
            <option value="national">National</option>
            <option value="international">International</option>
          </select>
        </div>
      </div>

      <div className="filters-footer">
        <div className="selected-filters">
          <span className="selected-label">Selected:</span>
          {filters.category && (
            <span className="filter-tag">
              {filters.category}
              <button onClick={() => clearFilter('category')}>×</button>
            </span>
          )}
          {filters.sub_category && (
            <span className="filter-tag">
              {filters.sub_category}
              <button onClick={() => clearFilter('sub_category')}>×</button>
            </span>
          )}
          {filters.department_name && (
            <span className="filter-tag">
              {filters.department_name}
              <button onClick={() => clearFilter('department_name')}>×</button>
            </span>
          )}
          {filters.time_horizon && (
            <span className="filter-tag">
              {filters.time_horizon}
              <button onClick={() => clearFilter('time_horizon')}>×</button>
            </span>
          )}
          {filters.scope && (
            <span className="filter-tag">
              {filters.scope}
              <button onClick={() => clearFilter('scope')}>×</button>
            </span>
          )}
        </div>

        <div className="view-toggle">
          <span className="view-label">View:</span>
          <button
            className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
          >
            List
          </button>
          <button
            className={`view-button ${viewMode === 'grouped' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grouped')}
          >
            Grouped
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filters;
