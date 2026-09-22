import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { supabase } from '../supabase';

export default function LeaderboardBottomSheet({ postId, onClose }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_attempts')
        .select('*')
        .eq('post_id', postId)
        .order('score', { ascending: false })
        .order('questions_attempted', { ascending: true })
        .limit(10);

      if (error) throw error;
      setAttempts(data || []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) fetchLeaderboard();
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dimmed Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Container */}
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl shadow-2xl relative flex flex-col h-[75vh] animate-[slideUp_0.3s_ease-out]">
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            <h2 className="text-lg font-bold text-[#0B2457]">Leaderboard</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Leaderboard Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No one has attempted this yet.</p>
              <p className="text-sm mt-1">Be the first to claim the top spot!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt, index) => (
                <div 
                  key={attempt.id || index}
                  className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-500">
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-[#0B2457] font-bold overflow-hidden">
                      {attempt.avatar_url ? (
                        <img src={attempt.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (attempt.username || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {attempt.username || 'Anonymous'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {attempt.questions_attempted} attempted
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-[#FFF5D1] text-[#0B2457] px-3 py-1 rounded-full font-bold text-sm border border-[#FFE173]">
                    {attempt.score}/{attempt.questions_attempted}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
