import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, User, Plus } from 'lucide-react';
import StateHomeFeed from './StateHomeFeed';
import Profile from './Profile';
import UploadTestSeries from './UploadTestSeries';
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
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-gray-50 shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-blue-600 flex items-center justify-between py-3 px-4 shadow-md z-10 sticky top-0 min-h-[60px]">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>
              <span className="text-white">Prep</span>
              <span className="text-yellow-400">Buddy</span>
            </span>
            {isAdmin && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-blue-400">
                Admin
              </span>
            )}
          </h1>
          <span className="text-white/70 text-[10px] font-medium tracking-wider uppercase">State Govt Mode</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <Routes>
          <Route path="/" element={<StateHomeFeed />} />
          <Route path="/profile" element={<Profile onLogout={onLogout} />} />
        </Routes>
      </main>

      {/* Floating Action Button (Admin Only) */}
      {isAdmin && isHome && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="absolute bottom-24 right-5 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 text-white active:scale-95 transition-transform z-40"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-around items-center sticky bottom-0 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.02)] min-h-[70px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/state-home');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 p-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-blue-600 scale-110' 
                  : 'text-gray-400 hover:text-gray-600 hover:scale-105'
              }`}
            >
              <div className={`relative ${isActive ? 'mb-1' : 'mb-0.5'}`}>
                <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold opacity-100' : 'font-medium opacity-0 h-0 overflow-hidden'}`}>
                {item.label}
              </span>
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
