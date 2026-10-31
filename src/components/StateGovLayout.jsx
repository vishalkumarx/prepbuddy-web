import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Plus, Search, X, BookOpen, ShoppingBag } from 'lucide-react';
import { SearchContext } from '../App';
import StateHomeFeed from './StateHomeFeed';
import Profile from './Profile';
import UploadTestSeries from './UploadTestSeries';
import UploadJSONQuestions from './UploadJSONQuestions';
import CourseDetail from './CourseDetail';
import TestTaking from './TestTaking';
import Leaderboard from './Leaderboard';
import ViewSolution from './ViewSolution';
import BannerManager from './BannerManager';
import Store from './Store';
import ResourceDetail from './ResourceDetail';
import UploadResource from './UploadResource';
import StoreManager from './StoreManager';
import { UserManager } from '../utils/UserManager';
import { useAuthModal } from '../context/AuthModalContext';

export default function StateGovLayout({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { requireAuth } = useAuthModal();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = UserManager.isAdmin();

  const isHome = location.pathname === '/' || location.pathname === '/state-home';
  const isStore = location.pathname === '/store';
  const isTestRoute = location.pathname.startsWith('/test/');
  const showBottomNav = location.pathname === '/' || location.pathname === '/profile' || location.pathname === '/state-home' || location.pathname === '/my-tests' || location.pathname === '/store';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/my-tests', icon: BookOpen, label: 'My Tests', requiresAuth: true },
    { path: '/store', icon: ShoppingBag, label: 'Store' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = (e, item) => {
    if (item.requiresAuth) {
      const allowed = requireAuth(() => {}, {
        title: 'Sign in to View My Tests',
        description: 'Sign in with your Google account to access your enrolled courses and test history.'
      });
      if (!allowed) {
        e.preventDefault();
      }
    }
  };

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-50 overflow-hidden relative">
      
      {/* Desktop Sidebar (Left) */}
      {!isTestRoute && (
        <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full py-6 flex-shrink-0 z-20">
        <div className="px-6 mb-8">
          <Link to="/" className="inline-block transition-transform active:scale-95" title="Go to GoalPrep Homepage">
            <img src="/goalprep-logo.png" alt="GoalPrep" className="h-12 w-auto object-contain" />
          </Link>
          {isAdmin && (
            <span className="mt-1.5 inline-block bg-secondary/20 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-secondary/30">
              Admin
            </span>
          )}
        </div>
        <div className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/state-home');
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={(e) => handleNavClick(e, item)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-indigo-50 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
        </nav>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Mobile Header */}
        {!isTestRoute && (
          <header className="md:hidden bg-primary flex items-center justify-between py-2 px-4 shadow-md z-10 sticky top-0 min-h-[58px] flex-shrink-0">
            {isSearchOpen ? (
              <div className="flex items-center w-full bg-white/10 rounded-xl px-3 py-1 border border-white/20">
                <Search size={18} className="text-white/70" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
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
              <div className="flex items-center justify-between w-full">
                <Link to="/" className="flex flex-col justify-center transition-transform active:scale-95" title="Go to GoalPrep Homepage">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="GoalPrep" className="h-9 w-auto object-contain max-w-[220px]" />
                    {isAdmin && (
                      <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-secondary/30 mt-1">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase mt-0.5">
                    Practice | Analyse | Achieve
                  </span>
                </Link>
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Search size={22} />
                </button>
              </div>
            )}
          </header>
        )}

        {/* Desktop Search & Navigation Header */}
        {!isTestRoute && (
          <header className="hidden md:flex bg-white items-center justify-between py-3 px-8 border-b border-gray-200 z-10 flex-shrink-0 shadow-xs">
            <div className="flex-1 max-w-xl relative">
              <Search size={18} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search test series, questions, notes & resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100/90 border border-transparent focus:border-primary/20 outline-none text-gray-900 pl-10 pr-10 py-2.5 rounded-full placeholder-gray-400 text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/60 transition-colors"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="bg-secondary/20 text-secondary text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border border-secondary/30">
                  Admin Active
                </span>
              )}
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-app-bg md:bg-gray-50/50 ${showBottomNav ? 'pb-[70px] md:pb-0' : 'md:pb-0'}`}>
          <div className={`h-full w-full mx-auto relative ${isTestRoute ? 'max-w-none md:p-0' : 'max-w-[1000px] md:p-6 md:pb-20'}`}>
            <Routes>
              <Route path="/" element={<StateHomeFeed />} />
              <Route path="/my-tests" element={<StateHomeFeed onlyEnrolled={true} />} />
              <Route path="/store" element={<Store />} />
              <Route path="/store/:id" element={<ResourceDetail />} />
              <Route path="/upload-resource" element={<UploadResource />} />
              <Route path="/edit-resource/:id" element={<UploadResource isEdit={true} />} />
              <Route path="/profile" element={<Profile onLogout={onLogout} />} />
              <Route path="/admin/upload-json" element={<UploadJSONQuestions />} />
              <Route path="/course/:id" element={<CourseDetail />} />
              <Route path="/test/:courseId/:category/:subcategory" element={<TestTaking />} />
              <Route path="/leaderboard/:courseId/:category/:subcategory" element={<Leaderboard />} />
              <Route path="/solution/:courseId/:category/:subcategory" element={<ViewSolution />} />
              <Route path="/admin/banners" element={<BannerManager />} />
              <Route path="/admin/store" element={<StoreManager />} />
            </Routes>
          </div>
        </main>

        {/* Floating Action Button (Admin Only) */}
        {isAdmin && (isHome || isStore) && (
          <button
            onClick={() => {
              if (isStore) {
                navigate('/upload-resource');
              } else {
                setShowUploadModal(true);
              }
            }}
            className="absolute bottom-24 md:bottom-8 right-6 bg-secondary text-primary p-4 rounded-2xl shadow-lg hover:bg-yellow-500 transition-all z-30 flex items-center justify-center hover:scale-105 active:scale-95"
            title={isStore ? "Upload Note / Resource" : "Create Test Series"}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}

        {/* Bottom Navigation */}
        {showBottomNav && (
          <nav className="md:hidden absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[65px] z-40 pb-safe flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/state-home');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors
                    ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Modals */}
        {showUploadModal && (
          <UploadTestSeries 
            onClose={() => setShowUploadModal(false)} 
            onUploaded={() => {
              setShowUploadModal(false);
            }}
          />
        )}
      </div>
      </div>
    </SearchContext.Provider>
  );
}
