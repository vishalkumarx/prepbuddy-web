import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function TestTaking() {
  const { category, subcategory } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionText }
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!window.confirm("Are you sure you want to submit your test?")) return;
    
    setIsSubmitting(true);
    const score = calculateScore();
    const userId = UserManager.getUserId();
    const username = UserManager.getUsername() || "Anonymous User";
    
    try {
      const { error } = await supabase
        .from('prepbuddy_test_attempts')
        .insert([{
          user_id: userId,
          username: username,
          category: decodeURIComponent(category),
          subcategory: decodeURIComponent(subcategory),
          score: score,
          total: questions.length
        }]);
        
      if (error) throw error;
      
      // Navigate to leaderboard
      navigate(`/leaderboard/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`, { replace: true });
    } catch (err) {
      alert("Error submitting test: " + err.message);
      setIsSubmitting(false);
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
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1.5 rounded-full mr-3">
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
      <div className="flex-1 overflow-y-auto p-5 relative">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 leading-snug mb-6">
            <span className="text-indigo-600 mr-2">Q{currentIdx + 1}.</span>
            {currentQ.question}
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
                  <span className={`text-sm ${isSelected ? 'font-bold text-indigo-900' : 'font-medium text-gray-700'}`}>
                    {opt}
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all active:scale-95"
          >
            {isSubmitting ? 'Submitting...' : (
              <>
                <CheckCircle2 size={18} /> Submit
              </>
            )}
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
    </div>
  );
}
