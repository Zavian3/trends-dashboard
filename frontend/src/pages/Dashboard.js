import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Header from '../components/Header';
import Filters from '../components/Filters';
import StatsCards from '../components/StatsCards';
import TrendsTable from '../components/TrendsTable';
import TrendDetailPanel from '../components/TrendDetailPanel';
import './Dashboard.css';

const Dashboard = ({ showToast }) => {
  const { user, API_URL } = useAuth();
  const [trends, setTrends] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [filters, setFilters] = useState({
    department_name: '',
    category: '',
    sub_category: '',
    time_horizon: '',
    scope: '',
    status: ''
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'
  const [selectedTrends, setSelectedTrends] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTrends();
    fetchStats();
  }, [filters]);

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
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`${API_URL}/api/trends?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTrends(response.data.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.department_name) params.append('department_name', filters.department_name);
      if (filters.category) params.append('category', filters.category);
      if (filters.sub_category) params.append('sub_category', filters.sub_category);

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

  // Pagination logic
  const indexOfLastTrend = currentPage * itemsPerPage;
  const indexOfFirstTrend = indexOfLastTrend - itemsPerPage;
  const currentTrends = trends.slice(indexOfFirstTrend, indexOfLastTrend);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="dashboard">
      <Header />
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Trend and skill dashboard</h1>
          <p className="dashboard-subtitle">
            This is a description of what people can expect and what people should do etc.
          </p>
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
          trends={currentTrends}
          loading={loading}
          onTrendClick={handleTrendClick}
          viewMode={viewMode}
          isAdmin={user?.user_type === 'admin'}
          selectedTrends={selectedTrends}
          onTrendSelect={handleTrendSelect}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={trends.length}
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
