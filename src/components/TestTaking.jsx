import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { UserManager } from '../utils/UserManager';
import { processHtml } from '../utils/htmlUtils';

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
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
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

  // Handle image loading in question content
  useEffect(() => {
    if (!scrollContainerRef.current || !testStarted) return;
    
    const images = scrollContainerRef.current.querySelectorAll('.html-content img');
    images.forEach(img => {
      if (img.parentElement.classList.contains('image-wrapper')) return;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper relative min-h-[120px] w-full bg-slate-50 rounded-xl flex items-center justify-center my-3 border border-slate-100 overflow-hidden';
      
      const loadingText = document.createElement('span');
      loadingText.className = 'absolute text-xs text-slate-400 font-medium tracking-wide flex items-center gap-2';
      loadingText.innerHTML = '<svg class="animate-spin h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Loading image...';
      
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(loadingText);
      wrapper.appendChild(img);
      
      img.classList.add('opacity-0', 'transition-opacity', 'duration-500', 'z-10', 'relative', 'w-full', 'object-contain', 'rounded-xl');
      
      const handleLoad = () => {
        img.classList.remove('opacity-0');
        img.classList.add('opacity-100');
        loadingText.remove();
        wrapper.classList.remove('min-h-[120px]', 'bg-slate-50', 'border-slate-100', 'border');
      };
      
      if (img.complete && img.naturalHeight > 0) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = () => {
          loadingText.innerHTML = '⚠️ Failed to load image';
          loadingText.classList.replace('text-slate-400', 'text-red-400');
          img.classList.add('hidden');
        };
      }
    });
  }, [currentIdx, questions, testStarted]);

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

  // Save progress continuously — only after test has actually started
  useEffect(() => {
    if (testStarted && questions.length > 0) {
      localStorage.setItem(progressKey, JSON.stringify({ currentIdx, answers }));
    }
  }, [testStarted, currentIdx, answers, questions, progressKey]);

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

        // If resuming a paused test, skip dialog and start immediately
        const saved = localStorage.getItem(`test_progress_${UserManager.getUserId()}_${courseId}_${decodeURIComponent(category)}_${decodeURIComponent(subcategory)}`);
        if (saved) {
          setTestStarted(true);
        } else {
          setShowStartDialog(true);
        }
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
      let submitCourseId = courseId;
      
      // If taking a free test, we need to map 'free' to the actual UUID of the free course
      if (courseId === 'free') {
        const { data: freeCourse } = await supabase
          .from('prepbuddy_test_series')
          .select('id')
          .eq('title', 'INTERNAL_FREE_TEST_SECTION')
          .single();
        if (freeCourse) {
          submitCourseId = freeCourse.id;
        }
      }

      const { error } = await supabase
        .from('prepbuddy_test_attempts')
        .insert([{
          user_id: userId,
          username: username,
          course_id: submitCourseId,
          category: decodeURIComponent(category),
          subcategory: decodeURIComponent(subcategory),
          score: score,
          total: questions.length
        }]);
        
      if (error) throw error;
      
      // Clear saved progress on successful submission
      localStorage.removeItem(progressKey);

      // Save answers for analysis
      const analysisKey = `test_analysis_${userId}_${courseId}_${decodeURIComponent(category)}_${decodeURIComponent(subcategory)}`;
      localStorage.setItem(analysisKey, JSON.stringify(answers));
      
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

      {/* Start Dialog Overlay */}
      {showStartDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header band */}
            <div className="bg-primary px-6 py-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{decodeURIComponent(category)}</p>
              <h2 className="text-xl font-black leading-tight">{decodeURIComponent(subcategory)}</h2>
            </div>

            {/* Info rows */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Questions</p>
                    <p className="text-lg font-black text-gray-900">{questions.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Time Limit</p>
                    <p className="text-lg font-black text-gray-900">No Limit</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl px-4 py-3 text-xs text-blue-700 font-medium leading-relaxed">
                📌 You can navigate between questions freely. Your progress is auto-saved.
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowStartDialog(false); setTestStarted(true); }}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/30 hover:bg-primary-light transition-colors active:scale-[0.98]"
              >
                Start Test →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Body — only render after Start Test is confirmed */}
      {testStarted && <>

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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 overflow-x-hidden">
            <div className="text-lg font-medium text-gray-900 leading-snug mb-6 html-content flex flex-col gap-2">
            <span className="text-indigo-600 shrink-0">Q{currentIdx + 1}.</span>
            <span dangerouslySetInnerHTML={{ __html: processHtml(currentQ.question) }} />
          </div>

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
                  <span 
                    className={`text-sm html-content ${isSelected ? 'font-bold text-indigo-900' : 'font-medium text-gray-700'}`}
                    dangerouslySetInnerHTML={{ __html: processHtml(opt) }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <button 
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className={`px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1 transition-colors ${currentIdx === 0 ? 'opacity-0 pointer-events-none' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <ChevronLeft size={18} /> Prev
          </button>
          
          {isLast ? (
            <button 
              onClick={() => setShowSubmitPrompt(true)}
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all active:scale-95"
            >
              <>
                <CheckCircle2 size={18} /> Submit
              </>
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1 bg-[#0B2457] text-white hover:bg-blue-900 shadow-md transition-all active:scale-95"
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
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

      {/* End testStarted gate */}
      </>}
    </div>
  );
}
