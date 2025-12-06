/* ===========================================
   DSS Decal AI Tutor - Auth Hook
   
   Contributor: [Your Name]
   
   Usage:
   import { useAuth } from './useAuth'
   
   function App() {
     const { user, token, loading, login, logout } = useAuth();
     
     if (loading) return <div>Loading...</div>;
     
     return user ? <LoggedInView /> : <GuestView />;
   }
   =========================================== */

import { useState, useEffect } from 'react';

const LEADERBOARD_API_URL = "http://127.0.0.1:8001";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount and when token changes
  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const res = await fetch(`${LEADERBOARD_API_URL}/users/me/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Invalid token');
      }

      const data = await res.json();
      setUser({
        name: data.display_name,
        stats: data
      });
    } catch (err) {
      console.error('Auth error:', err);
      // Invalid token - clear it
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser: loadUser
  };
}

export default useAuth;

