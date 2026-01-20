import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--lavender)'
      }}>
        <div style={{ color: 'var(--vintage-lavender)', fontSize: '1.2rem' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user?.user_type !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;
