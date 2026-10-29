import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, role, logout } = useAuth();

  // Role normalization check
  const isPatientOrAdmin = role === 'PATIENT' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';

  const userInitial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() || 'U');

  return (
    <aside className="app-sidebar glass-panel" aria-label="Main sidebar">
      <div className="sidebar-top">
        {/* Brand mark */}
        <div className="sidebar-brand">
          <div className="sidebar-badge" aria-hidden="true">
            {/* Natural Leaf Icon */}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-title">HMS</span>
            <span className="brand-subtitle">Appointments and queue</span>
          </div>
        </div>

        {/* Navigation filtered by role */}
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {isPatientOrAdmin && (
            <NavLink
              to="/book"
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span>Book a visit</span>
            </NavLink>
          )}

          <NavLink
            to="/appointments"
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span>Appointments</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span>Reports</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* User info and Sign out */}
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="user-avatar" aria-hidden="true">
            {userInitial}
          </div>
          <div className="user-details">
            <span className="user-name" title={user?.fullName || user?.email}>
              {user?.fullName || 'User'}
            </span>
            <span className="user-role-tag">{role ? role.toLowerCase() : 'user'}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="btn-glass"
          style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
          aria-label="Sign out of system"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
