/* ===========================================
   DSS Decal AI Tutor - User Section Component
   
   Contributor: [Your Name]
   
   The header section showing login/signup or user info
   
   Usage:
   import UserSection from './UserSection'
   
   <UserSection 
     user={user}
     onLoginClick={() => setShowAuth(true)}
     onLogout={logout}
   />
   =========================================== */

import React from 'react';

export default function UserSection({ user, onLoginClick, onLogout }) {
  if (user) {
    // Logged in view
    return (
      <div className="user-section">
        <div className="user-info">
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <span>{user.name}</span>
        </div>
        <button className="auth-btn btn-logout" onClick={onLogout}>
          Log Out
        </button>
      </div>
    );
  }

  // Guest view
  return (
    <div className="user-section">
      <button 
        className="auth-btn btn-secondary" 
        onClick={() => onLoginClick('login')}
      >
        Log In
      </button>
      <button 
        className="auth-btn btn-primary" 
        onClick={() => onLoginClick('register')}
      >
        Sign Up
      </button>
    </div>
  );
}

