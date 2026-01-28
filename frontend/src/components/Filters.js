import React, { useState, useRef, useEffect } from 'react';
import './Filters.css';

const MultiSelectDropdown = ({ label, options, selectedValues, onChange, keyField = 'value', labelField = 'label' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return label;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt[keyField] === selectedValues[0]);
      return option ? option[labelField] : label;
    }
    return `${label} (${selectedValues.length})`;
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <button
        className={`multi-select-button ${selectedValues.length > 0 ? 'has-selection' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="multi-select-text">{getDisplayText()}</span>
        <svg className={`dropdown-arrow ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="multi-select-menu">
          {options.length === 0 ? (
            <div className="multi-select-empty">No options available</div>
          ) : (
            options.map((option) => (
              <label key={option[keyField]} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option[keyField])}
                  onChange={() => handleToggle(option[keyField])}
                />
                <span className="checkbox-custom"></span>
                <span className="option-label">{option[labelField]}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

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
  const handleMultiSelectChange = (field, values) => {
    onFilterChange({ [field]: values });
  };

  const clearAllFilters = () => {
    onFilterChange({
      status: [],
      department_name: [],
      category: [],
      sub_category: [],
      time_horizon: [],
      scope: [],
      impact_label: []
    });
  };

  // Prepare options for dropdowns
  const departmentOptions = departments.map(dept => ({ value: dept.name, label: dept.name }));
  const categoryOptions = categories.map(cat => ({ value: cat.category_name, label: cat.category_name }));
  const subcategoryOptions = subcategories.map(sub => ({ value: sub.sub_category_name, label: sub.sub_category_name }));
  
  const timeHorizonOptions = [
    { value: 'short_term', label: 'Short term' },
    { value: 'medium_term', label: 'Medium term' },
    { value: 'long_term', label: 'Long term' }
  ];

  const scopeOptions = [
    { value: 'local', label: 'Local' },
    { value: 'regional', label: 'Regional' },
    { value: 'national', label: 'National' },
    { value: 'international', label: 'International' }
  ];

  const impactOptions = [
    { value: 'Very High', label: 'Very High' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft (Pending Approval)' },
    { value: 'confirmed', label: 'Confirmed' }
  ];

  // Calculate total active filters
  const totalActiveFilters = Object.values(filters).reduce((sum, filter) => {
    return sum + (Array.isArray(filter) ? filter.length : (filter ? 1 : 0));
  }, 0);

  return (
    <div className="filters-container">
      <div className="filters-header">
        <span className="filters-label">
          Filters {totalActiveFilters > 0 && <span className="filter-count">({totalActiveFilters})</span>}
        </span>
        {totalActiveFilters > 0 && (
          <button className="clear-all-btn" onClick={clearAllFilters}>Clear All</button>
        )}
      </div>

      <div className="filters-row">
        {isAdmin && (
          <div className="filter-group">
            <MultiSelectDropdown
              label="Status"
              options={statusOptions}
              selectedValues={filters.status || []}
              onChange={(values) => handleMultiSelectChange('status', values)}
            />
          </div>
        )}

        <div className="filter-group">
          <MultiSelectDropdown
            label="Sector"
            options={departmentOptions}
            selectedValues={filters.department_name || []}
            onChange={(values) => handleMultiSelectChange('department_name', values)}
          />
        </div>

        <div className="filter-group">
          <MultiSelectDropdown
            label="Category"
            options={categoryOptions}
            selectedValues={filters.category || []}
            onChange={(values) => handleMultiSelectChange('category', values)}
          />
        </div>

        <div className="filter-group">
          <MultiSelectDropdown
            label="Subcategory"
            options={subcategoryOptions}
            selectedValues={filters.sub_category || []}
            onChange={(values) => handleMultiSelectChange('sub_category', values)}
          />
        </div>

        <div className="filter-group">
          <MultiSelectDropdown
            label="Time Horizon"
            options={timeHorizonOptions}
            selectedValues={filters.time_horizon || []}
            onChange={(values) => handleMultiSelectChange('time_horizon', values)}
          />
        </div>

        <div className="filter-group">
          <MultiSelectDropdown
            label="Scope"
            options={scopeOptions}
            selectedValues={filters.scope || []}
            onChange={(values) => handleMultiSelectChange('scope', values)}
          />
        </div>

        <div className="filter-group">
          <MultiSelectDropdown
            label="Impact Label"
            options={impactOptions}
            selectedValues={filters.impact_label || []}
            onChange={(values) => handleMultiSelectChange('impact_label', values)}
          />
        </div>
      </div>

      <div className="filters-footer">
        <div className="selected-filters">
          <span className="selected-label">Selected:</span>
          {(filters.department_name || []).map(value => (
            <span key={value} className="filter-tag">
              {value}
              <button onClick={() => handleMultiSelectChange('department_name', (filters.department_name || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
          {(filters.category || []).map(value => (
            <span key={value} className="filter-tag">
              {value}
              <button onClick={() => handleMultiSelectChange('category', (filters.category || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
          {(filters.sub_category || []).map(value => (
            <span key={value} className="filter-tag">
              {value}
              <button onClick={() => handleMultiSelectChange('sub_category', (filters.sub_category || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
          {(filters.time_horizon || []).map(value => (
            <span key={value} className="filter-tag">
              {value.replace(/_/g, ' ')}
              <button onClick={() => handleMultiSelectChange('time_horizon', (filters.time_horizon || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
          {(filters.scope || []).map(value => (
            <span key={value} className="filter-tag">
              {value}
              <button onClick={() => handleMultiSelectChange('scope', (filters.scope || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
          {(filters.impact_label || []).map(value => (
            <span key={value} className="filter-tag">
              {value}
              <button onClick={() => handleMultiSelectChange('impact_label', (filters.impact_label || []).filter(v => v !== value))}>×</button>
            </span>
          ))}
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
