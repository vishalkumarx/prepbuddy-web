import React from 'react';
import { Link } from 'react-router-dom';
import { UserManager } from '../utils/UserManager';
import { LogOut, User, Mail, Award, CheckCircle, Users, Settings } from 'lucide-react';

export default function Profile({ onLogout }) {
  const username = UserManager.getUsername() || 'Anonymous';
  const email = UserManager.getEmail() || 'No email provided';
  const avatar = UserManager.getAvatar();
  const isAdmin = UserManager.isAdmin();

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Profile Header Background */}
      <div className="bg-primary pt-10 pb-24 px-6 rounded-b-[2rem] shadow-md relative">
        {/* Admin Badge */}
        {isAdmin && (
          <div className="absolute top-4 right-4 bg-secondary text-primary text-xs font-bold px-2 py-1 rounded shadow-sm border border-secondary/50">
            ADMIN
          </div>
        )}

      </div>

      {/* Profile Card Overlay */}
      <div className="px-5 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center border border-gray-100">
          
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-white shadow-md flex items-center justify-center -mt-16 mb-4 overflow-hidden">
            {avatar && avatar !== "undefined" ? (
              <img src={avatar} alt={username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={40} className="text-primary" />
            )}
          </div>

          {/* User Info */}
          <h3 className="text-xl font-bold text-gray-900 text-center">{username}</h3>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1 mb-6">
            <Mail size={14} />
            {email}
          </p>

          <div className="w-full h-[1px] bg-gray-100 mb-6"></div>

          {/* Stats / Info Row */}
          <div className="w-full flex justify-around mb-6 px-2">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                <CheckCircle size={20} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">Active</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-1">
                <Award size={20} className="text-orange-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">Learner</span>
            </div>
          </div>

          {/* Admin Buttons */}
          {isAdmin && (
            <>
              <Link 
                to="/admin/sessions"
                className="w-full py-3.5 mb-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-100 shadow-sm"
              >
                <Users size={18} />
                View User Sessions
              </Link>
            </>
          )}

          {/* Reset Mode Button */}
          <button 
            onClick={() => {
              UserManager.clearPreparation();
              window.location.reload();
            }}
            className="w-full py-3.5 mb-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200 shadow-sm"
          >
            <Settings size={18} />
            Change Exam Goal
          </button>

          {/* Logout Button */}
          <button 
            onClick={onLogout}
            className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-100 shadow-sm"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
      
      {/* Footer Text */}
      <div className="mt-auto pt-8 pb-4 text-center">
        <p className="text-xs text-gray-400 font-medium tracking-wide">PrepBuddy v1.0.0</p>
      </div>
    </div>
  );
}
