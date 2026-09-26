import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, User, Plus } from 'lucide-react';
import StateHomeFeed from './StateHomeFeed';
import Profile from './Profile';
import UploadTestSeries from './UploadTestSeries';
import UploadJSONQuestions from './UploadJSONQuestions';
import CourseDetail from './CourseDetail';
import TestTaking from './TestTaking';
import Leaderboard from './Leaderboard';
import ViewSolution from './ViewSolution';
import BannerManager from './BannerManager';
import { UserManager } from '../utils/UserManager';

export default function StateGovLayout({ onLogout }) {
  const location = useLocation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const isAdmin = UserManager.isAdmin();

  const isHome = location.pathname === '/' || location.pathname === '/state-home';
  const showBottomNav = location.pathname === '/' || location.pathname === '/profile' || location.pathname === '/state-home';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-50 overflow-hidden relative">
      
      {/* Desktop Sidebar (Left) */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full py-6 flex-shrink-0 z-20">
        <div className="px-6 mb-8">
          <img src="/goalprep-logo.png" alt="GoalPrep" className="h-12 w-auto object-contain" />
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
        <header className="md:hidden bg-primary flex flex-col items-center justify-center py-2 px-4 shadow-md z-10 sticky top-0 min-h-[58px] flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="GoalPrep" className="h-9 w-auto object-contain max-w-[220px]" />
            {isAdmin && (
              <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-secondary/30">
                Admin
              </span>
            )}
          </div>
          <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">
            State Government
          </span>
        </header>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-app-bg md:bg-gray-50/50 ${showBottomNav ? 'pb-[70px] md:pb-0' : 'md:pb-0'}`}>
          <div className="h-full w-full max-w-[1000px] mx-auto md:p-6 md:pb-20 relative">
            <Routes>
              <Route path="/" element={<StateHomeFeed />} />
              <Route path="/profile" element={<Profile onLogout={onLogout} />} />
              <Route path="/admin/upload-json" element={<UploadJSONQuestions />} />
              <Route path="/course/:id" element={<CourseDetail />} />
              <Route path="/test/:courseId/:category/:subcategory" element={<TestTaking />} />
              <Route path="/leaderboard/:courseId/:category/:subcategory" element={<Leaderboard />} />
              <Route path="/solution/:courseId/:category/:subcategory" element={<ViewSolution />} />
              <Route path="/admin/banners" element={<BannerManager />} />
            </Routes>
          </div>
        </main>

        {/* Floating Action Button (Admin Only) */}
        {isAdmin && isHome && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="absolute bottom-24 md:bottom-8 right-6 bg-secondary text-primary p-4 rounded-2xl shadow-lg hover:bg-yellow-500 transition-all z-30 flex items-center justify-center hover:scale-105 active:scale-95"
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
  );
}
