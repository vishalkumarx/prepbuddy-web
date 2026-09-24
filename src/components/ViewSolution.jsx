import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ViewSolution() {
  const { courseId, category, subcategory } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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
    
    // Scroll to top
    window.scrollTo(0, 0);
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [category, subcategory]);

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

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg">
      {/* Header */}
      <header className="bg-primary flex items-center p-4 shadow-md z-10 sticky top-0 min-h-[58px]">
        <button onClick={() => navigate(`/course/${courseId}`)} className="text-white hover:bg-white/10 p-1.5 rounded-full mr-3">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-white font-bold truncate text-sm">Solutions: {decodeURIComponent(subcategory)}</h1>
          <p className="text-white/70 text-[10px] uppercase tracking-wider truncate">{decodeURIComponent(category)}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-10 space-y-6">
        {questions.map((q, idx) => {
          const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
          const safeAns = String(q.answer || "").trim().toLowerCase();
          
          let correctOptionText = safeAns;
          options.forEach((o, i) => {
            const letter = String.fromCharCode(65 + i).toLowerCase();
            if (String(o).trim().toLowerCase() === safeAns || letter === safeAns) {
              correctOptionText = o;
            }
          });

          return (
            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
              <div className="absolute -top-3 -left-2 bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                Q{idx + 1}
              </div>
              <h2 className="text-base font-bold text-gray-900 leading-snug mb-4 mt-2 whitespace-pre-wrap">
                {q.question}
              </h2>

              <div className="space-y-2">
                {options.map((opt, oIdx) => {
                  const optLetter = String.fromCharCode(65 + oIdx);
                  const isCorrect = String(opt).trim().toLowerCase() === String(correctOptionText).trim().toLowerCase();
                  
                  return (
                    <div 
                      key={oIdx}
                      className={`flex items-start p-3 rounded-xl border-2 transition-all ${
                        isCorrect 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                          : 'border-gray-50 bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mr-3 mt-0.5 ${
                        isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {optLetter}
                      </div>
                      <span className={`text-sm whitespace-pre-wrap ${isCorrect ? 'font-bold text-emerald-900' : 'font-medium text-gray-500'}`}>
                        {opt}
                      </span>
                      {isCorrect && (
                        <div className="ml-auto mt-0.5 text-emerald-500">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">Explanation:</h4>
                  <p className="text-xs text-blue-900/80 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
