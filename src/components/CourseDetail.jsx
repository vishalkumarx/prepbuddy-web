import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, IndianRupee, Layers, FileText, CheckCircle2, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = UserManager.getUserId();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [attempts, setAttempts] = useState({});

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);

        // Check if enrolled and fetch attempts
        if (userId) {
          const { data: enrollmentData } = await supabase
            .from('prepbuddy_enrollments')
            .select('id')
            .eq('course_id', id)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (enrollmentData) {
            setIsEnrolled(true);
          }

          const { data: attemptsData } = await supabase
            .from('prepbuddy_test_attempts')
            .select('*')
            .eq('user_id', userId);
            
          if (attemptsData) {
            const attemptsMap = {};
            attemptsData.forEach(att => {
              const key = `${att.category}-${att.subcategory}`;
              if (!attemptsMap[key] || att.score > attemptsMap[key].score) {
                attemptsMap[key] = att;
              }
            });
            setAttempts(attemptsMap);
          }
        }

      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [id, userId]);

  const handleEnroll = async () => {
    if (isEnrolled) return;
    setEnrollLoading(true);
    try {
      const { error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: userId, course_id: id }]);
        
      if (error) throw error;
      setIsEnrolled(true);
    } catch (err) {
      alert('Error enrolling: ' + err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Course not found.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const linkedTests = course.linked_tests || [];
  
  // Group tests by category
  const grouped = linkedTests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  const totalTests = linkedTests.length;
  const attemptedCount = linkedTests.filter(t => attempts[`${t.category}-${t.subcategory}`]).length;
  const progressPercent = totalTests > 0 ? Math.round((attemptedCount / totalTests) * 100) : 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg pb-[80px] overflow-y-auto">
      {/* Top Banner & Nav */}
      <div className="relative w-full h-64 bg-gray-100 flex-shrink-0">
        {course.banner_url ? (
          <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
            <span className="text-white/20 font-bold text-4xl uppercase px-4 text-center">{course.title}</span>
          </div>
        )}
        
        {/* Back Button Gradient Overlay */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors pointer-events-auto"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="px-5 pt-6 pb-8 -mt-6 bg-white rounded-t-3xl relative shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.15)] flex-1">
        
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-black text-[#0B2457] leading-tight flex-1">
            {course.title}
          </h1>
          {!isEnrolled && (
            <div className="bg-[#0B2457] text-white font-bold px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap flex items-center flex-shrink-0 mt-1">
              {course.price > 0 ? (
                <>
                  <IndianRupee size={16} className="mr-0.5" />
                  {course.price}
                </>
              ) : (
                'Free'
              )}
            </div>
          )}
        </div>

        {/* Progress Bar (If Enrolled) */}
        {isEnrolled && (
          <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Progress</span>
              <span className="text-sm font-black text-[#0B2457]">{attemptedCount} <span className="text-gray-400 font-bold text-xs">/ {totalTests} Tests</span></span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)', animation: 'progress-shimmer 2s infinite' }} />
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {course.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {course.description}
          </p>
        )}

        {/* Included Tests Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Included Mock Tests</h2>
          </div>

          {linkedTests.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <p className="text-gray-500 font-medium text-sm">No tests have been added to this course yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([cat, tests]) => (
                <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                  <div 
                    onClick={() => toggleCategory(cat)}
                    className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 text-sm tracking-tight">{cat}</h3>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-200/50 px-2.5 py-1 rounded-md shrink-0">
                        {tests.length} {tests.length === 1 ? 'Test' : 'Tests'}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      {expandedCategories[cat] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  
                  {expandedCategories[cat] && (
                    <div className="p-3 space-y-2 bg-white">
                      {tests.map((test, idx) => {
                        const attempt = attempts[`${test.category}-${test.subcategory}`];
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (!attempt) {
                                if (isEnrolled) {
                                  navigate(`/test/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`);
                                } else {
                                  alert("Please enroll in the course first to take this test!");
                                }
                              }
                            }}
                            className={`flex flex-col gap-3 p-3 rounded-xl border ${isEnrolled ? 'border-gray-100 hover:border-indigo-200 bg-white shadow-sm hover:shadow-md' : 'border-gray-50 bg-gray-50/50 opacity-90 cursor-not-allowed'} transition-all group ${!attempt && isEnrolled ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <div className={`p-2 rounded-xl transition-colors shrink-0 ${isEnrolled ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-gray-200 text-gray-400'}`}>
                                <FileText size={18} />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                <h4 className={`font-bold text-sm leading-tight ${isEnrolled ? 'text-gray-900 group-hover:text-indigo-900' : 'text-gray-600'}`}>{test.subcategory}</h4>
                                
                                {!attempt && (
                                  <div className="mt-2 flex items-center">
                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${isEnrolled ? 'text-emerald-700 bg-emerald-100/70' : 'text-gray-500 bg-gray-200/60'}`}>
                                      {isEnrolled ? (
                                        <>
                                          <Unlock size={10} strokeWidth={3} />
                                          TAKE TEST
                                        </>
                                      ) : (
                                        <>
                                          <Lock size={10} strokeWidth={3} />
                                          LOCKED
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {attempt && (
                              <div className="flex flex-col gap-2 mt-1 w-full pt-2 border-t border-gray-50">
                                <div className="flex items-center justify-between text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-md">
                                  <span>Highest Score:</span>
                                  <span className="text-emerald-600">{attempt.score} / {attempt.total}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/solution/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors text-center"
                                  >
                                    VIEW SOLUTION
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/test/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors text-center"
                                  >
                                    ATTEMPT AGAIN
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buy/Start Button */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-50">
        <button 
          onClick={handleEnroll}
          disabled={enrollLoading || isEnrolled}
          className={`w-full font-bold py-4 rounded-xl text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
            isEnrolled 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-[#0B2457] text-white hover:bg-blue-900 active:scale-[0.98]'
          }`}
        >
          {enrollLoading ? 'Processing...' : (
            isEnrolled ? (
              <>
                <CheckCircle2 size={20} />
                Enrolled (Select a test above to begin)
              </>
            ) : (
              course.price > 0 ? 'Buy Now' : 'Enroll Now for Free'
            )
          )}
        </button>
      </div>
    </div>
  );
}
