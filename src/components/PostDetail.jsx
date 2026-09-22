import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import PostCard from './PostCard';
import CommentsBottomSheet from './CommentsBottomSheet';
import LeaderboardBottomSheet from './LeaderboardBottomSheet';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    if (location.state && location.state.fromApp) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // MCQ state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    fetchPost();
    
    // Load local attempt status
    const savedAttempt = localStorage.getItem(`attempt_${UserManager.getUserId()}_${id}`);
    if (savedAttempt) {
      setHasAttempted(true);
      try {
        setSelectedAnswers(JSON.parse(savedAttempt));
      } catch (e) {
        console.error("Failed to parse saved answers", e);
      }
    }
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data: postData, error: postError } = await supabase
        .from('feed_posts')
        .select('*, prepbuddy_comments(count), prepbuddy_post_likes(device_id), prepbuddy_sources(*)')
        .eq('id', id)
        .single();

      if (postError) throw postError;
      setPost(postData);
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualMcqs = post?.mcqs ? post.mcqs.filter(m => m.type !== 'article_link') : [];

  const handleOptionSelect = async (questionIdx, optionText) => {
    if (hasAttempted) return; // Prevent changing answer after submission

    const newAnswers = { ...selectedAnswers, [questionIdx]: optionText };
    setSelectedAnswers(newAnswers);

    // Check if all questions are answered
    if (actualMcqs.length > 0 && Object.keys(newAnswers).length === actualMcqs.length) {
      submitAttempt(newAnswers);
    }
  };

  const submitAttempt = async (answers) => {
    setHasAttempted(true);
    localStorage.setItem(`attempt_${UserManager.getUserId()}_${id}`, JSON.stringify(answers));

    // Calculate score
    let score = 0;
    actualMcqs.forEach((mcq, idx) => {
      if (answers[idx] === mcq.answer) {
        score++;
      }
    });

    try {
      const { error } = await supabase
        .from('prepbuddy_attempts')
        .insert([{
          post_id: id,
          user_id: UserManager.getUserId(),
          username: UserManager.getUsername() || 'Anonymous',
          avatar_url: null, // Update this if avatar URLs are supported in UserManager
          questions_attempted: Object.keys(answers).length,
          score: score
        }]);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to upload attempt score:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-4 text-center">
        <button onClick={handleBack} className="text-primary font-medium flex items-center gap-2 justify-center w-full">
          <ArrowLeft size={20} /> Go Back
        </button>
        <p className="mt-4 text-gray-500">Post not found.</p>
      </div>
    );
  }

  const totalQuestions = actualMcqs.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="flex flex-col h-full bg-app-bg relative">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-600 hover:text-primary">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-primary truncate max-w-[250px]">{post.headline || 'Post'}</h1>
        </div>
        {totalQuestions > 0 && (
          <button 
            onClick={() => setIsLeaderboardOpen(true)}
            className="text-yellow-500 bg-yellow-50 p-2 rounded-full hover:bg-yellow-100 transition-colors"
          >
            <Trophy size={20} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Post Content */}
        <div className="bg-white">
          <PostCard post={post} onCommentClick={() => setIsCommentSheetOpen(true)} />
        </div>

        {/* MCQs Section */}
        {totalQuestions > 0 && (
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Questions</h3>
              {hasAttempted ? (
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">✓ Attempted</span>
              ) : answeredCount > 0 ? (
                <span className="text-sm font-semibold text-amber-500 bg-amber-50 px-2 py-1 rounded">{answeredCount} of {totalQuestions} answered</span>
              ) : null}
            </div>

            {hasAttempted && (
              <div className="bg-green-50 text-green-800 text-sm font-semibold p-3 rounded-xl mb-4 border border-green-200 text-center">
                You have already completed these questions! Check the leaderboard for your score.
              </div>
            )}

            <div className="space-y-6">
              {actualMcqs.map((mcq, idx) => {
                const selectedOpt = selectedAnswers[idx];
                const showResults = hasAttempted || selectedOpt;

                return (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-[#0B2457] mb-3 leading-snug">
                      <span className="text-primary mr-1">Q{idx + 1}.</span> {mcq.question}
                    </h4>
                    
                    {mcq.options && mcq.options.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {mcq.options.map((opt, optIdx) => {
                          const isSelected = selectedOpt === opt;
                          const isCorrect = opt === mcq.answer;
                          
                          let optStyle = "border-gray-200 bg-white hover:bg-gray-50 text-gray-700";
                          if (showResults) {
                            if (isCorrect) {
                              optStyle = "border-green-500 bg-green-100 text-green-900 font-semibold";
                            } else if (isSelected) {
                              optStyle = "border-red-500 bg-red-100 text-red-900 font-semibold";
                            } else {
                              optStyle = "border-gray-200 bg-gray-50 opacity-60 text-gray-500";
                            }
                          } else if (isSelected) {
                            optStyle = "border-primary bg-primary/10 text-primary font-semibold";
                          }

                          return (
                            <button 
                              key={optIdx} 
                              onClick={() => handleOptionSelect(idx, opt)}
                              disabled={showResults}
                              className={`w-full text-left px-4 py-3 rounded-xl border flex items-start gap-3 transition-colors ${optStyle} ${showResults ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <span className="font-bold mt-0.5">{String.fromCharCode(65 + optIdx)}.</span>
                              <span className="text-sm">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {showResults && (mcq.answer || mcq.explanation) && (
                      <div className="bg-[#FFF5D1]/30 p-3 rounded-lg border border-[#FFE173]/50 mt-4">
                        {mcq.answer && (
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            <span className="text-green-600">Answer:</span> {mcq.answer}
                          </p>
                        )}
                        {mcq.explanation && (
                          <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-800">Explanation:</span> {mcq.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {!hasAttempted && answeredCount > 0 && answeredCount < totalQuestions && (
              <button 
                onClick={() => submitAttempt(selectedAnswers)}
                className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
              >
                Submit Answers
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sheet Modals */}
      {isCommentSheetOpen && (
        <CommentsBottomSheet 
          post={post} 
          onClose={() => setIsCommentSheetOpen(false)} 
        />
      )}
      
      {isLeaderboardOpen && (
        <LeaderboardBottomSheet 
          postId={id} 
          onClose={() => setIsLeaderboardOpen(false)} 
        />
      )}
    </div>
  );
}
