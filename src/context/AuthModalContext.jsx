import React, { createContext, useContext, useState } from 'react';
import { UserManager } from '../utils/UserManager';
import { supabase } from '../supabase';
import { X, Sparkles, ShieldCheck } from 'lucide-react';

const AuthModalContext = createContext();

export const useAuthModal = () => useContext(AuthModalContext);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: 'Sign in to Continue',
    description: 'Sign in with your Google account to access tests, save your score, and view performance analytics.',
    onSuccess: null
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * requireAuth checks if the user is signed in with a valid email.
   * If yes, executes callback immediately.
   * If no, opens the Google Sign-in modal.
   */
  const requireAuth = (callback, config = {}) => {
    if (UserManager.isLoggedIn()) {
      if (typeof callback === 'function') callback();
      return true;
    }

    setModalConfig({
      title: config.title || 'Sign in to Continue',
      description: config.description || 'Sign in with your Google account to access tests, save your score, and view performance analytics.',
      onSuccess: callback || null
    });
    setIsOpen(true);
    return false;
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      let redirectUrl = window.location.href;
      if (window.location.pathname === '/profile') {
        redirectUrl = window.location.origin + '/';
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error logging in:', err);
      alert('Failed to initialize Google login. Ensure Supabase is configured correctly.');
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsLoading(false);
  };

  return (
    <AuthModalContext.Provider value={{ requireAuth, openLoginModal: (config) => requireAuth(null, config), closeModal }}>
      {children}

      {/* Floating Login Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Logo Image */}
            <div className="w-full max-w-[190px] h-14 mb-5 flex items-center justify-center bg-[#0B2457] rounded-2xl p-2.5 shadow-md">
              <img src="/logo.png" alt="GoalPrep Logo" className="w-full h-full object-contain" />
            </div>

            <h3 className="text-xl font-black text-gray-900 text-center mb-1.5 tracking-tight">
              {modalConfig.title}
            </h3>
            <p className="text-center text-xs font-medium text-gray-500 mb-6 px-2 leading-relaxed">
              {modalConfig.description}
            </p>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 shadow-md bg-[#0B2457] text-white text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
              )}
              <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Free instant access • No password needed</span>
            </div>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}
