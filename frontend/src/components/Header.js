import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getUserTypeLabel = (userType) => {
    const labels = {
      admin: 'Administrator',
      internal_teacher: 'Internal Teacher',
      internal_business: 'Internal Business',
      external: 'External User'
    };
    return labels[userType] || userType;
  };

  const getCurrentPage = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/users') return 'User Management';
    return 'Dashboard';
  };

  const isAdmin = user?.user_type === 'admin';

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="breadcrumb">
            <span className="breadcrumb-item">home</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">{getCurrentPage()}</span>
          </div>
          
          {isAdmin && (
            <nav className="header-nav">
              <button
                className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`nav-btn ${location.pathname === '/users' ? 'active' : ''}`}
                onClick={() => navigate('/users')}
              >
                Users
              </button>
            </nav>
          )}
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-type">{getUserTypeLabel(user?.user_type)}</span>
          </div>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
