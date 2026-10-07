import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function AllFreeTests() {
  const navigate = useNavigate();
  const [freeTests, setFreeTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attemptsMap, setAttemptsMap] = useState({});
  const [freeAttemptsDetail, setFreeAttemptsDetail] = useState({});
  const [questionCounts, setQuestionCounts] = useState({});

  useEffect(() => {
    const fetchQuestionCounts = async (tests) => {
      if (!tests || tests.length === 0) return;
      const counts = {};
      await Promise.all(tests.map(async (test) => {
        const { count } = await supabase
          .from('prepbuddy_questions')
          .select('*', { count: 'exact', head: true })
          .eq('category', test.category)
          .eq('subcategory', test.subcategory);
        counts[`${test.category}-${test.subcategory}`] = count || 0;
      }));
      setQuestionCounts(counts);
    };

    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .eq('title', 'INTERNAL_FREE_TEST_SECTION')
          .single();
        if (data) {
          const tests = data.linked_tests || [];
          // Validate each test still exists in the questions table
          const validationResults = await Promise.all(
            tests.map(async (t) => {
              const { count } = await supabase
                .from('prepbuddy_questions')
                .select('*', { count: 'exact', head: true })
                .eq('category', t.category)
                .eq('subcategory', t.subcategory);
              return { test: t, count: count || 0 };
            })
          );
          const validTests = validationResults.filter(r => r.count > 0).map(r => r.test);
          setFreeTests(validTests);
          fetchQuestionCounts(validTests);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAttempts = async () => {
      const userId = UserManager.getUserId();
      if (!userId) return;
      const { data } = await supabase
        .from('prepbuddy_test_attempts')
        .select('category, subcategory, score, total')
        .eq('user_id', userId)
        .eq('course_id', 'free');
      if (data) {
        const map = {};
        const detail = {};
        data.forEach(d => {
          const key = `${d.category}-${d.subcategory}`;
          map[key] = true;
          if (!detail[key] || d.score > detail[key].score) detail[key] = d;
        });
        setAttemptsMap(map);
        setFreeAttemptsDetail(detail);
      }
    };

    fetchData();
    fetchAttempts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[100dvh] bg-app-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-app-bg pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="ml-2">
          <h1 className="text-lg font-black text-primary">Free Tests</h1>
          <p className="text-xs text-gray-400">{freeTests.length} tests available</p>
        </div>
      </header>

      <div className="p-4 grid grid-cols-1 gap-3">
        {freeTests.map((test, idx) => {
          const key = `${test.category}-${test.subcategory}`;
          const isAttempted = !!attemptsMap[key];
          const attempt = freeAttemptsDetail[key];
          const progressKey = `test_progress_${UserManager.getUserId()}_free_${test.category}_${test.subcategory}`;
          const isPaused = !!localStorage.getItem(progressKey);
          const qCount = questionCounts[`${test.category}-${test.subcategory}`] || 0;

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{test.category}</p>
                  {test.prep_mode && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                      {test.prep_mode === 'central_gov' ? 'Central Govt.' : 'State Govt.'}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 leading-tight mb-3">{test.subcategory}</h3>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{qCount} Questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600">{test.time_limit ? `${test.time_limit} min` : 'No Limit'}</span>
                  </div>
                  {isAttempted && attempt && (
                    <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 rounded-xl px-2.5 py-1">
                      <span className="text-[10px] font-bold text-gray-500">Best:</span>
                      <span className="text-xs font-black text-emerald-700">{attempt.score}/{attempt.total}</span>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  {isAttempted ? (
                    <>
                      <button
                        onClick={() => navigate(`/solution/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`)}
                        className="flex-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl transition-colors text-center"
                      >
                        View Analysis
                      </button>
                      <button
                        onClick={() => navigate(`/test/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`)}
                        className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors text-center ${isPaused ? 'bg-secondary text-gray-900 hover:bg-yellow-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        {isPaused ? 'Resume Test' : 'Attempt Again'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(`/test/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`)}
                      className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors text-center ${isPaused ? 'bg-secondary text-gray-900 hover:bg-yellow-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                      {isPaused ? 'Resume Test' : 'Attempt Now →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
