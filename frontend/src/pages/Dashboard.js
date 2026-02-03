import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDepartments, getCategories, bulkUpdateWorkplaceDevelopmentStatus, getWorkplaceDevelopments, getSkills } from '../utils/api';
import Header from '../components/Header';
import Filters from '../components/Filters';
import DashboardCards from '../components/DashboardCards';
import TrendsTablePanel from '../components/TrendsTablePanel';
import WorkplaceDevelopmentDetail from '../components/WorkplaceDevelopmentDetail';
import Loader from '../components/Loader';
import './Dashboard.css';

// User Avatar Component for non-admin users
const UserAvatar = ({ user, logout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  const getUserTypeLabel = (userType) => {
    const labels = {
      admin: 'Administrator',
      internal_teacher: 'Internal Teacher',
      internal_business: 'Internal Business',
      external: 'External User'
    };
    return labels[userType] || userType;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <div className="user-menu-inline" ref={dropdownRef}>
      <button 
        className="user-avatar"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title={`${user?.first_name} ${user?.last_name}`}
      >
        {getInitials(user?.first_name, user?.last_name)}
      </button>
      
      {dropdownOpen && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="dropdown-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="dropdown-user-type">{getUserTypeLabel(user?.user_type)}</div>
          </div>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ showToast }) => {
  const { user, logout } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDevelopment, setSelectedDevelopment] = useState(null);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillDevelopments, setSkillDevelopments] = useState([]);
  const [selectedDevelopments, setSelectedDevelopments] = useState([]);
  const [filters, setFilters] = useState({
    department_name: [],
    category: [],
    time_horizon: [],
    scope: [],
    status: [],
    impact_label: [],
    training_effort: []
  });
  const [sortBy, setSortBy] = useState('priority');
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialLoading(true);
        
        // Fetch departments and categories in parallel
        const [deptData, catData] = await Promise.all([
          getDepartments({ active_only: true }),
          getCategories()
        ]);
        
        setDepartments(deptData.departments || []);
        setCategories(catData.categories || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showToast && showToast('Failed to load data', 'error');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when Trend panel is open
  useEffect(() => {
    if (selectedTrend) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedTrend]);

  // Lock body scroll when Skills panel is open
  useEffect(() => {
    if (selectedSkill) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedSkill]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDevelopmentClick = (development) => {
    setSelectedDevelopment(development);
  };

  const handleTrendClick = (trend) => {
    setSelectedTrend(trend);
  };

  const handleSkillClick = async (skill) => {
    setSelectedSkill(skill);
    // Fetch all skills records to find workplace developments that use this skill
    try {
      // Fetch all skills from the skills table
      const skillsResponse = await getSkills();
      
      // Filter skills by the skill name (case-insensitive match)
      const matchingSkills = skillsResponse.skills.filter(s => 
        s.skill_name.toLowerCase() === skill.skill_name.toLowerCase()
      );
      
      // Get unique workplace development titles
      const developmentTitles = [...new Set(matchingSkills.map(s => s.workplace_development_title))];
      
      if (developmentTitles.length === 0) {
        setSkillDevelopments([]);
        return;
      }
      
      // Fetch all workplace developments
      const devsResponse = await getWorkplaceDevelopments({
        limit: 1000
      });
      
      // Filter to only include developments that match the titles from skills table
      const filtered = devsResponse.workplace_developments.filter(dev => 
        developmentTitles.includes(dev.title)
      );
      
      setSkillDevelopments(filtered);
    } catch (error) {
      console.error('Error fetching skill developments:', error);
      setSkillDevelopments([]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDevelopments.length === 0) return;
    
    try {
      await bulkUpdateWorkplaceDevelopmentStatus(selectedDevelopments, 'active');
      showToast && showToast(`${selectedDevelopments.length} developments approved!`, 'success');
      setSelectedDevelopments([]);
      // Trigger refresh by changing a filter state
      setFilters(prev => ({...prev}));
    } catch (error) {
      console.error('Error approving developments:', error);
      showToast && showToast('Failed to approve developments', 'error');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedDevelopments.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to archive ${selectedDevelopments.length} developments?`)) {
      return;
    }
    
    try {
      await bulkUpdateWorkplaceDevelopmentStatus(selectedDevelopments, 'archived');
      showToast && showToast(`${selectedDevelopments.length} developments archived!`, 'success');
      setSelectedDevelopments([]);
      // Trigger refresh
      setFilters(prev => ({...prev}));
    } catch (error) {
      console.error('Error archiving developments:', error);
      showToast && showToast('Failed to archive developments', 'error');
    }
  };

  if (initialLoading) {
    return <Loader />;
  }

  const isAdmin = user?.user_type === 'admin';

  return (
    <div className="dashboard">
      <Header />
      
      <div className={`dashboard-container ${!isAdmin ? 'minimal-header' : ''}`}>
        <div className="dashboard-header-section">
          <div className="dashboard-title-row">
            <h1 className="dashboard-title">Workplace Developments Dashboard</h1>
            {!isAdmin && (
              <UserAvatar user={user} logout={logout} />
            )}
          </div>
        </div>

        {/* Filters FIRST - Above everything */}
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          departments={departments}
          categories={categories}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isAdmin={isAdmin}
        />

        {/* Dashboard Cards */}
        <DashboardCards
          filters={filters}
          onTrendClick={handleTrendClick}
          onDevelopmentClick={handleDevelopmentClick}
          onSkillClick={handleSkillClick}
        />

        {/* Bulk Actions (when items selected) */}
        {isAdmin && selectedDevelopments.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedDevelopments.length} selected
            </span>
            <button className="btn btn-approve" onClick={handleBulkApprove}>
              ✓ Approve
            </button>
            <button className="btn btn-archive" onClick={handleBulkArchive}>
              📦 Archive
            </button>
            <button 
              className="btn btn-clear" 
              onClick={() => setSelectedDevelopments([])}
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Trends Table with Slide-in Panels */}
        <TrendsTablePanel
          filters={filters}
          sortBy={sortBy}
          isAdmin={isAdmin}
        />

        {/* Development Detail Panel (from cards) */}
        {selectedDevelopment && (
          <WorkplaceDevelopmentDetail
            developmentId={selectedDevelopment.id}
            onClose={() => setSelectedDevelopment(null)}
            onDevelopmentClick={(dev) => {
              setSelectedDevelopment(null);
              setSelectedDevelopment(dev);
            }}
          />
        )}

        {/* Trend Detail Panel (from cards) */}
        {selectedTrend && (
          <div 
            className="side-panel-overlay" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTrend(null);
              }
            }}
          >
            <div className="side-panel half-screen">
              <div className="panel-header">
                <div>
                  <h2>{selectedTrend.title}</h2>
                  <p className="panel-subtitle">{selectedTrend.department_name}</p>
                </div>
                <button className="panel-close" onClick={() => setSelectedTrend(null)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="panel-content">
                <div className="info-section">
                  <h3>Overview</h3>
                  <div className="info-grid">
                    {selectedTrend.priority_score && (
                      <div className="info-item">
                        <span className="info-label">Priority Score</span>
                        <span className="info-value">{selectedTrend.priority_score.toFixed(1)}</span>
                      </div>
                    )}
                    {selectedTrend.momentum_score && (
                      <div className="info-item">
                        <span className="info-label">Momentum Score</span>
                        <span className="info-value">{selectedTrend.momentum_score.toFixed(1)}</span>
                      </div>
                    )}
                    {selectedTrend.coverage_count !== undefined && (
                      <div className="info-item">
                        <span className="info-label">Workplace Developments</span>
                        <span className="info-value">{selectedTrend.coverage_count}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTrend.description && (
                  <div className="info-section">
                    <h3>Description</h3>
                    <p>{selectedTrend.description}</p>
                  </div>
                )}

                {selectedTrend.department_name && (
                  <div className="info-section">
                    <h3>Sector</h3>
                    <span className="badge badge-sector">{selectedTrend.department_name}</span>
                  </div>
                )}

                {selectedTrend.status && (
                  <div className="info-section">
                    <h3>Status</h3>
                    <span className={`badge badge-status status-${selectedTrend.status}`}>
                      {selectedTrend.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Skills Detail Panel (from cards) */}
        {selectedSkill && (
          <div 
            className="side-panel-overlay" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedSkill(null);
              }
            }}
          >
            <div className="side-panel half-screen">
              <div className="panel-header">
                <div>
                  <h2>{selectedSkill.skill_name}</h2>
                  <p className="panel-subtitle">
                    <span className={`badge badge-skill-type skill-${selectedSkill.skill_type.replace('_', '-')}`}>
                      {selectedSkill.skill_type.replace('_', ' ')}
                    </span>
                    {selectedSkill.occurrence_count && (
                      <span className="meta-text" style={{ marginLeft: '0.5rem' }}>
                        {selectedSkill.occurrence_count} occurrences
                      </span>
                    )}
                  </p>
                </div>
                <button className="panel-close" onClick={() => setSelectedSkill(null)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="panel-content">
                <div className="info-section">
                  <h3>Workplace Developments Mentioning This Skill</h3>
                  {skillDevelopments.length === 0 ? (
                    <p className="empty-message">No workplace developments found for this skill.</p>
                  ) : (
                    <div className="developments-list">
                      {skillDevelopments.map((dev, index) => (
                        <div 
                          key={dev.id} 
                          className="development-card clickable"
                          onClick={() => {
                            setSelectedSkill(null);
                            setSelectedDevelopment(dev);
                          }}
                        >
                          <div className="development-number">{index + 1}</div>
                          <div className="development-content">
                            <h4>{dev.title}</h4>
                            <div className="development-meta">
                              {dev.impact_label && (
                                <span className={`badge badge-impact impact-${dev.impact_label.toLowerCase().replace(' ', '-')}`}>
                                  {dev.impact_label}
                                </span>
                              )}
                              {dev.training_effort && (
                                <span className={`badge badge-effort effort-${dev.training_effort}`}>
                                  {dev.training_effort} effort
                                </span>
                              )}
                              {dev.scope && (
                                <span className={`badge badge-scope scope-${dev.scope}`}>
                                  {dev.scope}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="development-arrow">→</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
