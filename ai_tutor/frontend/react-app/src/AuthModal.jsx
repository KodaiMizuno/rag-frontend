/* ===========================================
   DSS Decal AI Tutor - Auth Modal Component
   
   Contributor: [Your Name]
   
   Usage:
   import AuthModal from './AuthModal'
   
   const [showAuth, setShowAuth] = useState(false);
   const [token, setToken] = useState(localStorage.getItem('token'));
   
   <AuthModal 
     isOpen={showAuth}
     onClose={() => setShowAuth(false)}
     onSuccess={(token) => {
       setToken(token);
       localStorage.setItem('token', token);
     }}
   />
   =========================================== */

import React, { useState } from 'react';

const LEADERBOARD_API_URL = "http://127.0.0.1:8001";

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const body = mode === 'login'
      ? { email, password }
      : { email, password, display_name: displayName || email.split('@')[0] };

    try {
      const res = await fetch(`${LEADERBOARD_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Success - pass token to parent
      onSuccess(data.access_token);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Welcome back! Log in to track your progress.'
              : 'Join the class and start learning!'}
          </p>
        </div>

        {error && (
          <div className="error-message show">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                placeholder="Your name on the leaderboard"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="auth-btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
            <button 
              type="button" 
              className="auth-btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="modal-switch">
          <span>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <a onClick={toggleMode}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  );
}

