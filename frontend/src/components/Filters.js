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
  sortBy,
  onSortChange,
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
      time_horizon: [],
      scope: [],
      impact_label: [],
      training_effort: []
    });
  };

  // Prepare options for dropdowns
  const departmentOptions = departments.map(dept => ({ value: dept.name, label: dept.name }));
  const categoryOptions = categories.map(cat => ({ value: cat.category_name, label: cat.category_name }));
  
  const statusOptions = isAdmin ? [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' }
  ] : [];

  const timeHorizonOptions = [
    { value: 'short_term', label: 'Short Term' },
    { value: 'medium_term', label: 'Medium Term' },
    { value: 'long_term', label: 'Long Term' }
  ];

  const scopeOptions = [
    { value: 'regional', label: 'Regional' },
    { value: 'national', label: 'National' }
  ];

  const impactLabelOptions = [
    { value: 'Very High', label: 'Very High' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
  ];

  const trainingEffortOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const sortOptions = [
    { value: 'priority', label: 'Priority' },
    { value: 'impact', label: 'Impact' },
    { value: 'effort', label: 'Effort' }
  ];

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) && value.length > 0
  );

  // Render active filter tags
  const renderFilterTags = () => {
    const tags = [];
    
    const allOptions = {
      department_name: departmentOptions,
      category: categoryOptions,
      time_horizon: timeHorizonOptions,
      scope: scopeOptions,
      impact_label: impactLabelOptions,
      training_effort: trainingEffortOptions,
      ...(isAdmin && { status: statusOptions })
    };

    Object.entries(filters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        values.forEach(value => {
          const options = allOptions[key] || [];
          const option = options.find(opt => opt.value === value);
          if (option) {
            tags.push({
              key,
              value,
              label: option.label,
              field: key.replace('_', ' ')
            });
          }
        });
      }
    });

    return tags;
  };

  const removeFilter = (key, value) => {
    const newValues = (filters[key] || []).filter(v => v !== value);
    onFilterChange({ [key]: newValues });
  };

  const filterTags = renderFilterTags();

  return (
    <div className="filters-container">
      <div className="filters-row">
        <div className="filters-group">
          {/* Sector Filter (First) */}
          <MultiSelectDropdown
            label="Sector"
            options={departmentOptions}
            selectedValues={filters.department_name || []}
            onChange={(values) => handleMultiSelectChange('department_name', values)}
          />

          {/* Category Filter */}
          <MultiSelectDropdown
            label="Category"
            options={categoryOptions}
            selectedValues={filters.category || []}
            onChange={(values) => handleMultiSelectChange('category', values)}
          />

          {/* Impact Label Filter */}
          <MultiSelectDropdown
            label="Impact"
            options={impactLabelOptions}
            selectedValues={filters.impact_label || []}
            onChange={(values) => handleMultiSelectChange('impact_label', values)}
          />

          {/* Training Effort Filter */}
          <MultiSelectDropdown
            label="Training Effort"
            options={trainingEffortOptions}
            selectedValues={filters.training_effort || []}
            onChange={(values) => handleMultiSelectChange('training_effort', values)}
          />

          {/* Time Horizon Filter */}
          <MultiSelectDropdown
            label="Time Horizon"
            options={timeHorizonOptions}
            selectedValues={filters.time_horizon || []}
            onChange={(values) => handleMultiSelectChange('time_horizon', values)}
          />

          {/* Scope Filter */}
          <MultiSelectDropdown
            label="Scope"
            options={scopeOptions}
            selectedValues={filters.scope || []}
            onChange={(values) => handleMultiSelectChange('scope', values)}
          />

          {/* Status Filter (Admin Only) */}
          {isAdmin && (
            <MultiSelectDropdown
              label="Status"
              options={statusOptions}
              selectedValues={filters.status || []}
              onChange={(values) => handleMultiSelectChange('status', values)}
            />
          )}

          {/* Sort Dropdown - Now part of the grid */}
          <div className="filter-group">
            <select
              id="sort-select"
              value={sortBy || 'priority'}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              className="multi-select-button sort-select-grid"
            >
              <option value="priority">Sort by: Priority</option>
              <option value="impact">Sort by: Impact</option>
              <option value="effort">Sort by: Effort</option>
            </select>
          </div>
        </div>

        {/* Clear All Button - Below the grid */}
        {hasActiveFilters && (
          <div className="filters-actions">
            <button 
              className="clear-all-button"
              onClick={clearAllFilters}
              type="button"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Filter Tags */}
      {filterTags.length > 0 && (
        <div className="filter-tags">
          {filterTags.map((tag, index) => (
            <div key={`${tag.key}-${tag.value}-${index}`} className="filter-tag">
              <span className="filter-tag-text">
                <span className="filter-tag-field">{tag.field}:</span> {tag.label}
              </span>
              <button
                className="filter-tag-remove"
                onClick={() => removeFilter(tag.key, tag.value)}
                type="button"
                aria-label={`Remove ${tag.label} filter`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Filters;
