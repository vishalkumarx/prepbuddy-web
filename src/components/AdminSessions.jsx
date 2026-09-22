import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { ArrowLeft, Users, Clock, Circle } from 'lucide-react';

export default function AdminSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Security check: Only admins can access this page
  if (!UserManager.isAdmin()) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Access Denied. Admins only.
      </div>
    );
  }

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('prepbuddy_user_sessions')
        .select('*')
        .order('last_active', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;
  const now = new Date().getTime();

  const SessionCard = ({ session }) => {
    const lastActiveDate = new Date(session.last_active);
    const isActive = now - lastActiveDate.getTime() <= ACTIVE_THRESHOLD_MS;
    let timeDisplay = lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // If it's not today, show date too
    if (new Date().toDateString() !== lastActiveDate.toDateString()) {
      timeDisplay = `${lastActiveDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeDisplay}`;
    }

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {session.avatar_url ? (
            <img src={session.avatar_url} alt={session.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-indigo-600 font-bold text-lg">{session.name ? session.name.charAt(0).toUpperCase() : 'U'}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-bold truncate">{session.name || 'Unknown User'}</h3>
          <p className="text-gray-500 text-xs truncate">{session.email}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={12} className="text-gray-400" />
            <span className="text-[10px] text-gray-500 font-medium">Last seen: {timeDisplay}</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-center justify-center">
          <Circle size={14} className={isActive ? "fill-green-500 text-green-500" : "fill-gray-300 text-gray-300"} />
          <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
            {isActive ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white flex items-center p-4 shadow-sm z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2 text-primary flex items-center gap-2">
          <Users size={20} />
          All Users ({sessions.length})
        </h1>
      </header>

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <section>
            {sessions.length > 0 ? (
              sessions.map(session => (
                <SessionCard key={session.user_id} session={session} />
              ))
            ) : (
              <div className="text-center p-6 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                No users found
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
