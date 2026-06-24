import React, { useState, useEffect } from 'react';
import { Terminal, Database, BookOpen, BarChart3, LogIn, LogOut, Code, User, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/Analytics';

export const API_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'kb' | 'analytics'>('editor');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  
  // Auth Form State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('editor');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const body = isLogin 
      ? { email: authEmail, password: authPassword }
      : { name: authName, email: authEmail, password: authPassword };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setShowAuthModal(false);
        setAuthPassword('');
      } else {
        // After signup, switch to login
        setIsLogin(true);
        setAuthName('');
        setAuthPassword('');
        alert('Registration successful! Please login.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col md:flex-row text-slate-100 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#0e1320] border-b md:border-b-0 md:border-r border-brand-border flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="p-6 border-b border-brand-border flex items-center space-x-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/40">
              <Code className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase">ReviewLLM</h1>
              <span className="text-[10px] text-indigo-400 font-medium">Hybrid Code Review</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20 border-l-4 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-5 w-5" />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => {
                if (!token) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('history');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20 border-l-4 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5" />
                <span>Review History</span>
              </div>
              {!token && <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Lock</span>}
            </button>

            <button
              onClick={() => setActiveTab('kb')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'kb'
                  ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20 border-l-4 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Knowledge Base</span>
            </button>

            <button
              onClick={() => {
                if (!token) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('analytics');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20 border-l-4 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5" />
                <span>Analytics Dashboard</span>
              </div>
              {!token && <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Lock</span>}
            </button>
          </nav>
        </div>

        {/* User Profile Area */}
        <div className="p-4 border-t border-brand-border bg-[#0b0e17]">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="bg-indigo-600 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm text-white border border-indigo-400 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/50"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsLogin(true);
                setAuthError('');
                setShowAuthModal(true);
              }}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-600/10"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {activeTab === 'editor' && (
          <Dashboard token={token} onAuthRequired={() => setShowAuthModal(true)} />
        )}
        {activeTab === 'history' && token && <History token={token} />}
        {activeTab === 'kb' && <KnowledgeBase />}
        {activeTab === 'analytics' && token && <Analytics token={token} />}
      </main>

      {/* Auth Modal Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-brand-border w-full max-w-md rounded-2xl shadow-xl p-8 relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              &times;
            </button>
            
            <h3 className="text-xl font-bold text-white mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {isLogin ? 'Access your dashboard analytics, history logs, and code patterns.' : 'Register to start tracking code scores and saving review history.'}
            </p>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all text-sm mt-2"
              >
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs">
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError('');
                }}
                className="text-indigo-400 hover:underline hover:text-indigo-300 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
