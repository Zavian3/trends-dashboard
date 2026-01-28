import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const getUserTypeLabel = (userType) => {
    const labels = {
      admin: 'Administrator',
      internal_teacher: 'Internal Teacher',
      internal_business: 'Internal Business',
      external: 'External User'
    };
    return labels[userType] || userType;
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  const getCurrentPage = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/users') return 'User Management';
    return 'Dashboard';
  };

  const isAdmin = user?.user_type === 'admin';

  // Close dropdown when clicking outside
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
    <header className={`header ${!isAdmin ? 'header-minimal' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          {isAdmin && (
            <>
              <div className="breadcrumb">
                <span className="breadcrumb-item">home</span>
                <span className="breadcrumb-separator">›</span>
                <span className="breadcrumb-item active">{getCurrentPage()}</span>
              </div>
              
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
            </>
          )}
        </div>
        
        {isAdmin && (
          <div className="header-right">
            <div className="user-menu" ref={dropdownRef}>
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
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
