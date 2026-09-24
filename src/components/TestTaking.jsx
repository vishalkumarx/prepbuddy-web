import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function TestTaking() {
  const { courseId, category, subcategory } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionText }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const scrollContainerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const attemptedCount = Object.keys(answers).length;
  const skippedCount = questions.length - attemptedCount;

  const progressKey = `test_progress_${UserManager.getUserId()}_${courseId}_${category}_${subcategory}`;

  // Scroll to top when question changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    
    // Also scroll the parent main container to top
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [currentIdx]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (isSubmittingRef.current) return;
      e.preventDefault();
      setShowExitPrompt(true);
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.currentIdx !== undefined) setCurrentIdx(parsed.currentIdx);
      } catch (e) {
        console.error("Failed to parse saved progress");
      }
    }
  }, [progressKey]);

  // Save progress continuously
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem(progressKey, JSON.stringify({ currentIdx, answers }));
    }
  }, [currentIdx, answers, questions, progressKey]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_questions')
          .select('*')
          .eq('category', decodeURIComponent(category))
          .eq('subcategory', decodeURIComponent(subcategory))
          .order('created_at', { ascending: true });

        if (error) throw error;
        setQuestions(data || []);
      } catch (err) {
        console.error("Error fetching test:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [category, subcategory]);

  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      const userAns = answers[q.id] || "";
      const safeAns = String(q.answer || "").trim().toLowerCase();
      const safeUserAns = String(userAns).trim().toLowerCase();
      
      // Determine correct option letter
      let correctLetter = "";
      let opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
      opts.forEach((o, i) => {
        if (String(o).trim().toLowerCase() === safeAns) {
          correctLetter = String.fromCharCode(65 + i).toLowerCase();
        }
      });
      
      const isCorrect = 
        safeUserAns === safeAns || 
        safeUserAns === correctLetter || 
        (correctLetter !== "" && safeUserAns === opts[correctLetter.charCodeAt(0) - 97]?.trim().toLowerCase());
        
      if (isCorrect || safeUserAns === String(q.answer || "").trim().toLowerCase()) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    const score = calculateScore();
    const userId = UserManager.getUserId();
    const username = UserManager.getUsername() || "Anonymous User";
    
    try {
      const { error } = await supabase
        .from('prepbuddy_test_attempts')
        .insert([{
          user_id: userId,
          username: username,
          course_id: courseId,
          category: decodeURIComponent(category),
          subcategory: decodeURIComponent(subcategory),
          score: score,
          total: questions.length
        }]);
        
      if (error) throw error;
      
      // Clear saved progress on successful submission
      localStorage.removeItem(progressKey);
      
      // Clean up the dummy history state we pushed for the back button
      navigate(-1);
      
      // Navigate to leaderboard
      setTimeout(() => {
        navigate(`/leaderboard/${courseId}/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`, { replace: true });
      }, 10);
    } catch (err) {
      alert("Error submitting test: " + err.message);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[100dvh] bg-app-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-app-bg">
        <p className="text-gray-500 mb-4">No questions found for this test.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const options = Array.isArray(currentQ.options) ? currentQ.options : (typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : []);
  const isLast = currentIdx === questions.length - 1;

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg pb-[80px]">
      {/* Header */}
      <header className="bg-primary flex items-center p-4 shadow-md z-10 sticky top-0 min-h-[58px]">
        <button onClick={() => setShowExitPrompt(true)} className="text-white hover:bg-white/10 p-1.5 rounded-full mr-3">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-white font-bold truncate text-sm">{decodeURIComponent(subcategory)}</h1>
          <p className="text-white/70 text-[10px] uppercase tracking-wider truncate">{decodeURIComponent(category)}</p>
        </div>
        <div className="text-white font-bold bg-white/20 px-3 py-1 rounded-lg text-sm border border-white/30">
          {currentIdx + 1} / {questions.length}
        </div>
      </header>

      {/* Main Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 relative">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 leading-snug mb-6 whitespace-pre-wrap">
            <span className="text-indigo-600 mr-2">Q{currentIdx + 1}.</span>
            {currentQ.question?.replace(/\\n/g, '\n')}
          </h2>

          <div className="space-y-3">
            {options.map((opt, oIdx) => {
              const optLetter = String.fromCharCode(65 + oIdx);
              const isSelected = answers[currentQ.id] === opt;
              
              return (
                <div 
                  key={oIdx}
                  onClick={() => handleSelectOption(currentQ.id, opt)}
                  className={`flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                      : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mr-3 mt-0.5 ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {optLetter}
                  </div>
                  <span className={`text-sm whitespace-pre-wrap ${isSelected ? 'font-bold text-indigo-900' : 'font-medium text-gray-700'}`}>
                    {opt?.replace(/\\n/g, '\n')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between gap-4">
        <button 
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft size={18} /> Prev
        </button>
        
        {isLast ? (
          <button 
            onClick={() => setShowSubmitPrompt(true)}
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all active:scale-95"
          >
            <>
              <CheckCircle2 size={18} /> Submit
            </>
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1 bg-[#0B2457] text-white hover:bg-blue-900 shadow-md transition-all active:scale-95"
          >
            Next <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Exit Prompt Modal */}
      {showExitPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">Pause Test?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to go back? Your progress and current answers are <span className="font-bold text-indigo-600">automatically saved</span>. You will resume from this exact question when you return.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowExitPrompt(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => navigate(-2)} // Go back twice because we pushed a dummy state
                className="flex-1 py-3 bg-[#0B2457] text-white font-bold rounded-xl shadow-md hover:bg-blue-900 transition-colors"
              >
                Yes, Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Prompt Modal */}
      {showSubmitPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-4">Submit Test?</h3>
            
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 space-y-3 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Total Questions:</span>
                <span className="text-sm font-black text-gray-900">{questions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Attempted:</span>
                <span className="text-sm font-black text-emerald-600">{attemptedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Skipped:</span>
                <span className="text-sm font-black text-orange-500">{skippedCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitPrompt(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Review
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-colors flex justify-center items-center gap-1.5"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
