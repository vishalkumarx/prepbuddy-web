import React, { useState } from 'react';
import { UserManager } from '../utils/UserManager';
import { supabase } from '../supabase';

export default function Login({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen px-6 relative" 
      style={{ 
        backgroundImage: 'url("/login-bg.jpg")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      
      <div 
        className="w-full max-w-sm p-8 rounded-[24px] shadow-2xl border border-white/20 flex flex-col items-center backdrop-blur-md bg-white/70" 
      >
        {/* Logo Image */}
        <div className="w-full max-w-[220px] h-16 mb-6 flex items-center justify-center bg-[#0B2457] rounded-2xl p-3 shadow-lg">
          <img src="/logo.png" alt="GoalPrep Logo" className="w-full h-full object-contain" />
        </div>
        
        <p className="text-center text-sm font-medium mb-10 px-4" style={{ color: '#526A91' }}>
          Your ultimate companion for competitive exam preparation.
        </p>

        {/* Google Login Button */}
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 shadow-md"
          style={{ 
            backgroundColor: '#0B2457', 
            color: '#FFFFFF' 
          }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        <p className="mt-8 text-xs text-center leading-relaxed" style={{ color: '#526A91' }}>
          By continuing, you agree to our <br/>
          <a href="#" className="underline font-medium hover:text-[#0B2457]">Terms of Service</a> and <a href="#" className="underline font-medium hover:text-[#0B2457]">Privacy Policy</a>
        </p>


      </div>
      
    </div>
  );
}
