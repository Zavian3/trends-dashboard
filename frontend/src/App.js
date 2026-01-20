import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PrivateRoute from './components/PrivateRoute';
import Toast from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toast toasts={toasts} removeToast={removeToast} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard showToast={showToast} />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute adminOnly={true}>
                  <UserManagement showToast={showToast} />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
