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
import Profile from './components/Profile';
import AdminSessions from './components/AdminSessions';
import UploadJSONQuestions from './components/UploadJSONQuestions';
import CreateTestSeries from './components/CreateTestSeries';
import DummyPaymentGateway from './components/DummyPaymentGateway';
import CourseControlPanel from './components/CourseControlPanel';
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
      <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-50 overflow-hidden relative">
        
        {/* Desktop Sidebar (Left) */}
        <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full py-6 flex-shrink-0 z-20">
          <div className="px-6 mb-8 flex items-center justify-between">
            <img src="/logo.png" alt="GoalPrep" className="h-8 w-auto object-contain" />
            {isAdmin && (
              <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-secondary/30 ml-2">
                Admin
              </span>
            )}
          </div>
          <div className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-indigo-50 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  <span className="text-[15px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden bg-primary flex items-center justify-between py-2 px-4 shadow-md z-10 sticky top-0 min-h-[56px] flex-shrink-0">
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

          {/* Desktop Search Header */}
          <header className="hidden md:flex bg-white items-center justify-between py-3 px-8 border-b border-gray-200 z-10 flex-shrink-0 shadow-sm">
             <div className="flex-1 max-w-xl relative">
                <Search size={18} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search posts, courses, and resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 border-none outline-none text-gray-900 px-10 py-2.5 rounded-full placeholder-gray-500 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
             </div>
             <div className="flex items-center gap-4">
                {/* Extra desktop header actions can go here */}
             </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto pb-[65px] md:pb-0 bg-app-bg md:bg-gray-50/50">
            <div className="h-full w-full max-w-[1000px] mx-auto md:p-6 md:pb-20 relative">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[65px] z-40 pb-safe flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* FAB */}
          {showFab && (
            <button 
              onClick={handleFabClick}
              className="absolute bottom-20 md:bottom-8 right-6 bg-secondary text-primary p-4 rounded-2xl shadow-lg hover:bg-yellow-500 transition-all z-30 flex items-center justify-center hover:scale-105 active:scale-95"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          )}
        </div>

      </div>
    </SearchContext.Provider>
  );
}

function MainAppRoutes({ isAuth, setIsAuth, preparationMode, setPreparationMode, handleLogout }) {
  if (!isAuth) {
    return (
      <div className="h-[100dvh] w-full bg-white relative overflow-hidden">
        <Login onLogin={() => setIsAuth(true)} />
      </div>
    );
  }

  if (!preparationMode) {
    return (
      <div className="h-[100dvh] w-full bg-white relative overflow-hidden">
        <PreparationSelector onSelect={setPreparationMode} />
      </div>
    );
  }

  if (preparationMode === 'state_gov') {
    return <StateGovLayout onLogout={handleLogout} />;
  }

  return (
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
        <Route path="/profile" element={<Profile onLogout={handleLogout} />} />
      </Routes>
    </Layout>
  );
}

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [preparationMode, setPreparationMode] = useState(UserManager.getPreparation());

  useEffect(() => {
    const trackSession = async (session) => {
      if (!session) return;
      try {
        await supabase.from('prepbuddy_user_sessions').upsert({
          user_id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
          last_active: new Date().toISOString()
        }, { onConflict: 'user_id' });
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
        setIsAuth(UserManager.isLoggedIn());
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    UserManager.logout();
    setIsAuth(false);
    setPreparationMode(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Unauthenticated Admin Routes */}
        <Route path="/admin/upload-json" element={<UploadJSONQuestions />} />
        <Route path="/upload-json" element={<UploadJSONQuestions />} />
        <Route path="/admin/create-test" element={<CreateTestSeries />} />
        <Route path="/admin/courses" element={<CourseControlPanel />} />
        <Route path="/payment/:type/:id" element={<DummyPaymentGateway />} />

        {/* Main Application Routes */}
        <Route 
          path="/*" 
          element={
            <MainAppRoutes 
              isAuth={isAuth} 
              setIsAuth={setIsAuth} 
              preparationMode={preparationMode} 
              setPreparationMode={setPreparationMode} 
              handleLogout={handleLogout} 
            />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
