import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Feed from './components/Feed';
import Login from './components/Login';
import PostDetail from './components/PostDetail';
import Store from './components/Store';
import UploadMains from './components/UploadMains';
import UploadResource from './components/UploadResource';
import ResourceDetail from './components/ResourceDetail';
import UploadPost from './components/UploadPost';
import AdminSessions from './components/AdminSessions';
import UploadJSONQuestions from './components/UploadJSONQuestions';
import PreparationSelector from './components/PreparationSelector';
import StateGovLayout from './components/StateGovLayout';
import { Home, User, BookOpen, Search, Plus, X, ShoppingBag } from 'lucide-react';
import { supabase } from './supabase';
import { UserManager } from './utils/UserManager';

export const SearchContext = React.createContext();

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/mains', icon: BookOpen, label: 'Mains' },
    { path: '/store', icon: ShoppingBag, label: 'Store' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isAdmin = UserManager.isAdmin();
  const showFab = isAdmin && (location.pathname === '/' || location.pathname === '/mains' || location.pathname === '/store');
  const handleFabClick = () => {
    if (location.pathname === '/mains') {
      navigate('/upload-mains');
    } else if (location.pathname === '/store') {
      navigate('/upload-resource');
    } else {
      navigate('/upload-post');
    }
  };

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-app-bg shadow-xl overflow-hidden relative">
        {/* Header */}
        <header className="bg-primary flex items-center justify-between py-2 px-4 shadow-md z-10 sticky top-0 min-h-[56px]">
          {isSearchOpen ? (
            <div className="flex items-center w-full bg-white/10 rounded-xl px-3 py-1 border border-white/20">
              <Search size={18} className="text-white/70" />
              <input
                type="text"
                autoFocus
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white px-3 py-1.5 placeholder-white/50 text-sm"
              />
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="p-1 rounded-full text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center pl-6">
                <img src="/logo.png" alt="GoalPrep" className="h-9 w-auto object-contain max-w-[220px]" />
                {isAdmin && (
                  <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-secondary/30 ml-2">
                    Admin
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 -mr-1 text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <Search size={22} />
              </button>
            </>
          )}
        </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[70px]">
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* FAB */}
      {showFab && (
        <button 
          onClick={handleFabClick}
          className="absolute bottom-24 right-6 bg-secondary text-primary p-4 rounded-2xl shadow-lg hover:bg-yellow-500 transition-all z-30 flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[65px] z-40 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors
                ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </SearchContext.Provider>
  );
}

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [preparationMode, setPreparationMode] = useState(UserManager.getPreparation());

  useEffect(() => {
    const trackSession = async (session) => {
      if (!session) return;
      try {
        const { data, error } = await supabase.from('prepbuddy_user_sessions').upsert({
          user_id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
          last_active: new Date().toISOString()
        }, { onConflict: 'user_id' });
        console.log('trackSession upsert → data:', data, 'error:', error);
      } catch (err) {
        console.error("Error tracking session:", err);
      }
    };

    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        UserManager.setUsername(session.user.user_metadata?.full_name || session.user.email);
        UserManager.setUserId(session.user.id);
        UserManager.setEmail(session.user.email);
        UserManager.setAvatar(session.user.user_metadata?.avatar_url);
        setIsAuth(true);
        trackSession(session);
      } else {
        setIsAuth(UserManager.isLoggedIn()); // Fallback for backwards compatibility if needed
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        UserManager.setUsername(session.user.user_metadata?.full_name || session.user.email);
        UserManager.setUserId(session.user.id);
        UserManager.setEmail(session.user.email);
        UserManager.setAvatar(session.user.user_metadata?.avatar_url);
        setIsAuth(true);
        trackSession(session);
      } else {
        UserManager.logout();
        setIsAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Allow public access to JSON question uploader route
  const currentPath = window.location.pathname;
  if (currentPath === '/admin/upload-json' || currentPath === '/upload-json') {
    return (
      <BrowserRouter>
        <UploadJSONQuestions />
      </BrowserRouter>
    );
  }

  if (!isAuth) {
    return (
      <div className="h-[100dvh] max-w-md mx-auto bg-white shadow-xl relative overflow-hidden">
        <Login onLogin={() => setIsAuth(true)} />
      </div>
    );
  }

  const handleLogout = async () => {
    window.history.replaceState(null, '', '/');
    await supabase.auth.signOut();
    UserManager.logout();
    setIsAuth(false);
    setPreparationMode(null);
  };

  if (!preparationMode) {
    return (
      <div className="h-[100dvh] max-w-md mx-auto bg-white shadow-xl relative overflow-hidden">
        <PreparationSelector onSelect={setPreparationMode} />
      </div>
    );
  }

  if (preparationMode === 'state_gov') {
    return (
      <BrowserRouter>
        <StateGovLayout onLogout={handleLogout} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed feedType="home" />} />
          <Route path="/mains" element={<Feed feedType="mains" />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/:id" element={<ResourceDetail />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/upload-mains" element={<UploadMains />} />
          <Route path="/edit-mains/:id" element={<UploadMains isEdit={true} />} />
          <Route path="/upload-post" element={<UploadPost />} />
          <Route path="/upload-resource" element={<UploadResource />} />
          <Route path="/edit-resource/:id" element={<UploadResource isEdit={true} />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/admin/upload-json" element={<UploadJSONQuestions />} />
          <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
