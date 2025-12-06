import { useState } from 'react';
import { useAuth } from './useAuth';
import LeaderboardTab from './LeaderboardTab';
import MyStatsTab from './MyStatsTab';
import AuthModal from './AuthModal';
import UserSection from './UserSection';
import './leaderboard.css';

function App() {
  const { user, token, login, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard');

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%',
      background: '#0a0f0f', 
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #27272a'
      }}>
        <h1 style={{ color: '#14b8a6', margin: 0 }}>🎓 DSS Decal AI Tutor</h1>
        <UserSection 
          user={user}
          onLoginClick={() => setShowAuth(true)}
          onLogout={logout}
        />
      </header>

      <nav style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        background: '#121a1a',
        padding: '4px',
        borderRadius: '12px'
      }}>
        <TabButton 
          active={activeTab === 'leaderboard'} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </TabButton>
        <TabButton 
          active={activeTab === 'stats'} 
          onClick={() => setActiveTab('stats')}
        >
          📊 My Stats
        </TabButton>
      </nav>

      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'stats' && (
        <MyStatsTab 
          token={token}
          onLoginClick={() => setShowAuth(true)}
        />
      )}

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={login}
      />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '14px 24px',
        border: 'none',
        background: active ? '#16201f' : 'transparent',
        color: active ? '#14b8a6' : '#a1a1aa',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '0.95rem'
      }}
    >
      {children}
    </button>
  );
}

export default App;
