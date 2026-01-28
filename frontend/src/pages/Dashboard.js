import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Header from '../components/Header';
import Filters from '../components/Filters';
import StatsCards from '../components/StatsCards';
import TrendsTable from '../components/TrendsTable';
import TrendDetailPanel from '../components/TrendDetailPanel';
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
  const { user, API_URL, logout } = useAuth();
  const [trends, setTrends] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [filters, setFilters] = useState({
    department_name: [],
    category: [],
    sub_category: [],
    time_horizon: [],
    scope: [],
    status: [],
    impact_label: []
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'
  const [selectedTrends, setSelectedTrends] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalTrends, setTotalTrends] = useState(0);
  
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    const initData = async () => {
      await fetchInitialData();
      await Promise.all([fetchTrends(), fetchStats()]);
      setInitialLoading(false);
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchTrends();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [depsRes, catsRes, subcatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/departments?active_only=true`, { headers }),
        axios.get(`${API_URL}/api/categories`, { headers }),
        axios.get(`${API_URL}/api/subcategories`, { headers })
      ]);

      setDepartments(depsRes.data.departments);
      setCategories(catsRes.data.categories);
      setSubcategories(subcatsRes.data.subcategories);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      // Only show loading indicator if not initial loading
      if (!initialLoading) {
        setLoading(true);
      }
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Add pagination params
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      
      // Add filter params - handle arrays for multi-select
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (Array.isArray(value) && value.length > 0) {
          // For array filters, append each value
          value.forEach(v => params.append(key, v));
        } else if (value && !Array.isArray(value)) {
          // For non-array filters (backwards compatibility)
          params.append(key, value);
        }
      });

      const response = await axios.get(`${API_URL}/api/trends?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTrends(response.data.trends);
      setTotalTrends(response.data.total || response.data.trends.length);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      if (!initialLoading) {
        setLoading(false);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Handle array-based filters for multi-select
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => params.append(key, v));
        } else if (value && !Array.isArray(value)) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${API_URL}/api/trends/stats?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    setCurrentPage(1); // Reset to first page when filters change
  };


  const handleTrendClick = (trend) => {
    setSelectedTrend(trend);
  };

  const handleCloseTrendDetail = () => {
    setSelectedTrend(null);
  };

  const handleTrendSelect = (trendId) => {
    setSelectedTrends(prev => {
      if (prev.includes(trendId)) {
        return prev.filter(id => id !== trendId);
      } else {
        return [...prev, trendId];
      }
    });
  };

  const handleBulkApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Approving trends:', selectedTrends);
      
      const response = await axios.put(
        `${API_URL}/api/trends/bulk-approve`,
        { trend_ids: selectedTrends },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Approve response:', response.data);
      showToast(`Successfully approved ${selectedTrends.length} trend(s)!`, 'success');
      setSelectedTrends([]);
      
      // Refresh data to show updated status
      await fetchTrends();
      await fetchStats();
    } catch (error) {
      console.error('Error approving trends:', error);
      console.error('Error response:', error.response?.data);
      showToast(`Failed to approve trends: ${error.response?.data?.error || error.message}`, 'error');
    }
  };

  const handleBulkDisapprove = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTrends.length} trend(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Disapproving trends:', selectedTrends);
      
      await axios.delete(
        `${API_URL}/api/trends/bulk-disapprove`,
        {
          data: { trend_ids: selectedTrends },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      showToast(`Successfully deleted ${selectedTrends.length} trend(s)!`, 'success');
      setSelectedTrends([]);
      
      // Refresh data to show updated list
      await fetchTrends();
      await fetchStats();
    } catch (error) {
      console.error('Error disapproving trends:', error);
      console.error('Error response:', error.response?.data);
      showToast(`Failed to disapprove trends: ${error.response?.data?.error || error.message}`, 'error');
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (initialLoading) {
    return <Loader message="Preparing your plan" subtitle="Setting up your dashboard and analyzing trends..." />;
  }

  return (
    <div className={`dashboard ${user?.user_type !== 'admin' ? 'dashboard-no-header' : ''}`}>
      <Header />
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <div>
              <h1>Trend and skill dashboard</h1>
              <p className="dashboard-subtitle">
                This is a description of what people can expect and what people should do etc.
              </p>
            </div>
            {user?.user_type !== 'admin' && (
              <UserAvatar user={user} logout={logout} />
            )}
          </div>
        </div>

        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          departments={departments}
          categories={categories}
          subcategories={subcategories}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isAdmin={user?.user_type === 'admin'}
        />

        {stats && <StatsCards stats={stats} />}

        {user?.user_type === 'admin' && selectedTrends.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">{selectedTrends.length} selected</span>
            <button className="btn-approve" onClick={handleBulkApprove}>
              Approve
            </button>
            <button className="btn-disapprove" onClick={handleBulkDisapprove}>
              Disapprove
            </button>
          </div>
        )}

        <TrendsTable
          trends={trends}
          loading={loading}
          onTrendClick={handleTrendClick}
          viewMode={viewMode}
          isAdmin={user?.user_type === 'admin'}
          selectedTrends={selectedTrends}
          onTrendSelect={handleTrendSelect}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalTrends}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {selectedTrend && (
        <TrendDetailPanel
          trend={selectedTrend}
          onClose={handleCloseTrendDetail}
          isAdmin={user?.user_type === 'admin'}
          onApprove={async () => {
            await fetchTrends();
            await fetchStats();
            showToast('Trend approved successfully!', 'success');
          }}
          onDisapprove={async () => {
            await fetchTrends();
            await fetchStats();
            showToast('Trend deleted successfully!', 'success');
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
