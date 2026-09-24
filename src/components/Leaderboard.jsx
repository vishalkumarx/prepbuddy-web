import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Trophy, Medal, User as UserIcon, Calendar } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function Leaderboard() {
  const { courseId, category, subcategory } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = UserManager.getUserId();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_attempts')
          .select('*')
          .eq('category', decodeURIComponent(category))
          .eq('subcategory', decodeURIComponent(subcategory))
          .eq('course_id', courseId)
          .order('score', { ascending: false })
          .order('created_at', { ascending: true }); // Tie-breaker: earlier attempt wins

        if (error) throw error;
        setAttempts(data || []);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [category, subcategory]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg pb-6">
      {/* Header Banner */}
      <div className="bg-[#0B2457] pt-8 pb-16 px-5 relative shrink-0">
        <button onClick={() => navigate(`/course/${courseId}`)} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center justify-center text-center mt-2">
          <div className="bg-amber-400 p-3 rounded-full mb-3 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            <Trophy size={32} className="text-[#0B2457]" />
          </div>
          <h1 className="text-xl font-black text-white leading-tight mb-1 tracking-wide">LEADERBOARD</h1>
          <h2 className="text-sm font-bold text-blue-200">{decodeURIComponent(subcategory)}</h2>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 px-4 -mt-10 relative z-10 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-hidden min-h-[50vh]">
          
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Trophy size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-bold mb-1">No attempts yet!</p>
              <p className="text-xs text-gray-400">Be the first to take this test.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attempts.map((attempt, idx) => {
                const isCurrentUser = attempt.user_id === currentUserId;
                const percentage = Math.round((attempt.score / attempt.total) * 100);
                
                let RankBadge = null;
                if (idx === 0) RankBadge = <Medal size={24} className="text-amber-500 drop-shadow-sm" />;
                else if (idx === 1) RankBadge = <Medal size={24} className="text-slate-400 drop-shadow-sm" />;
                else if (idx === 2) RankBadge = <Medal size={24} className="text-amber-700 drop-shadow-sm" />;
                else RankBadge = <span className="font-bold text-gray-400 w-6 text-center">{idx + 1}</span>;

                return (
                  <div key={attempt.id} className={`p-4 flex items-center gap-4 transition-colors ${isCurrentUser ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 flex justify-center items-center font-bold">
                      {RankBadge}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="bg-gradient-to-br from-indigo-100 to-blue-100 p-1.5 rounded-full text-indigo-600">
                          <UserIcon size={14} />
                        </div>
                        <h3 className={`font-bold truncate text-sm ${isCurrentUser ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {attempt.username || 'Anonymous User'}
                          {isCurrentUser && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium ml-8">
                        <Calendar size={10} />
                        {formatDate(attempt.created_at)}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-black ${percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {attempt.score}
                        </span>
                        <span className="text-xs font-bold text-gray-400">/ {attempt.total}</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                        SCORE
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
