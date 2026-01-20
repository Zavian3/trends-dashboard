import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './UserManagement.css';

const UserManagement = ({ showToast }) => {
  const { API_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'external',
    gender: '',
    date_of_birth: '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(response.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to fetch users', 'error');
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, password });
    return password;
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      showToast('Password copied to clipboard!', 'success');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.password) {
      showToast('Please enter or generate a password', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/users`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      showToast('User created successfully!', 'success');
      setShowAddForm(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        user_type: 'external',
        gender: '',
        date_of_birth: '',
        is_active: true
      });
      setGeneratedPassword('');
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(error.response?.data?.error || 'Failed to create user', 'error');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      showToast('User deleted successfully!', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(error.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/users/${userId}`,
        { is_active: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      showToast(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const getUserTypeLabel = (type) => {
    const labels = {
      'admin': 'Admin',
      'internal_teacher': 'Internal Teacher',
      'internal_business': 'Internal Business',
      'external': 'External User'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="user-management">
          <div className="loading">Loading users...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="user-management">
        <div className="user-management-content">
          <div className="user-management-header">
            <div>
              <h1>User Management</h1>
              <p className="subtitle">Manage system users and access</p>
            </div>
            <button 
              className="btn-add-user"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : '+ Add User'}
            </button>
          </div>

          {showAddForm && (
            <div className="add-user-form-container">
              <h2>Create New User</h2>
              <form onSubmit={handleSubmit} className="add-user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>User Type *</label>
                    <select
                      name="user_type"
                      value={formData.user_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="external">External User</option>
                      <option value="internal_teacher">Internal Teacher</option>
                      <option value="internal_business">Internal Business</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group password-group">
                  <label>Password *</label>
                  <div className="password-input-container">
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password or generate one"
                      required
                    />
                    <button
                      type="button"
                      className="btn-generate"
                      onClick={generatePassword}
                    >
                      Generate
                    </button>
                    {generatedPassword && (
                      <button
                        type="button"
                        className="btn-copy"
                        onClick={copyPassword}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  {generatedPassword && (
                    <p className="password-hint">Generated password: {generatedPassword}</p>
                  )}
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    Create User
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowAddForm(false);
                      setGeneratedPassword('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>User Type</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                    <td className="user-name-cell">
                      {user.first_name} {user.last_name}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`user-type-badge ${user.user_type}`}>
                        {getUserTypeLabel(user.user_type)}
                      </span>
                    </td>
                    <td>{user.gender || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-toggle-status"
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserManagement;
