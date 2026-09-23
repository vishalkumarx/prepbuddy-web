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
import { UserManager } from '../utils/UserManager';

export default function StateGovLayout({ onLogout }) {
  const location = useLocation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const isAdmin = UserManager.isAdmin();

  const isHome = location.pathname === '/' || location.pathname === '/state-home';

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-app-bg shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-primary flex flex-col items-center justify-center py-2 px-4 shadow-md z-10 sticky top-0 min-h-[58px]">
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth pb-[70px]">
        <Routes>
          <Route path="/" element={<StateHomeFeed />} />
          <Route path="/profile" element={<Profile onLogout={onLogout} />} />
          <Route path="/admin/upload-json" element={<UploadJSONQuestions />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/test/:category/:subcategory" element={<TestTaking />} />
          <Route path="/leaderboard/:category/:subcategory" element={<Leaderboard />} />
        </Routes>
      </main>

      {/* Floating Action Button (Admin Only) */}
      {isAdmin && isHome && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="absolute bottom-24 right-6 bg-secondary text-primary p-4 rounded-2xl shadow-lg hover:bg-yellow-500 transition-all z-30 flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[65px] z-40 pb-safe">
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
  );
}
