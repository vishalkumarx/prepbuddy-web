import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchContext } from '../App';
import { supabase } from '../supabase';
import { IndianRupee, Layers, Languages, Award, Newspaper, CheckCircle2, Tag, CheckCircle, XCircle, ArrowRight, Clock, Star } from 'lucide-react';
import TestimonialCarousel from './TestimonialCarousel';
import { UserManager } from '../utils/UserManager';
import { processHtml } from '../utils/htmlUtils';

export default function StateHomeFeed({ onlyEnrolled = false }) {
  const navigate = useNavigate();
  const [testSeries, setTestSeries] = useState([]);
  const [freeTests, setFreeTests] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [attemptsByCourse, setAttemptsByCourse] = useState({});
  const [freeAttemptsMap, setFreeAttemptsMap] = useState({});
  const [questionCounts, setQuestionCounts] = useState({}); // { 'category-subcategory': count }
  const [loading, setLoading] = useState(true);
  const { searchQuery } = useContext(SearchContext) || { searchQuery: '' };

  // Promo Code States
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [selectedCourseForBuy, setSelectedCourseForBuy] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // 'checking', 'valid', 'invalid'
  const [couponData, setCouponData] = useState(null);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const verifyCoupon = async () => {
    if (!couponCode.trim() || !selectedCourseForBuy) return;
    setCouponStatus('checking');
    try {
      const { data, error } = await supabase
        .from('prepbuddy_coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('resource_id', selectedCourseForBuy.id)
        .eq('is_active', true)
        .single();

      if (error || !data) throw new Error('Invalid coupon');

      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setCouponStatus('invalid');
        return;
      }

      if (data.user_email) {
        const userEmail = UserManager.getEmail();
        if (!userEmail || userEmail.toLowerCase() !== data.user_email.toLowerCase()) {
          setCouponStatus('invalid');
          return;
        }
      }

      if (data.max_uses !== null && (data.uses_count || 0) >= data.max_uses) {
        setCouponStatus('invalid');
        return;
      }

      let finalPrice = selectedCourseForBuy.price;
      if (data.discount_type === 'percentage') {
        finalPrice = selectedCourseForBuy.price - (selectedCourseForBuy.price * data.discount_value / 100);
      } else {
        finalPrice = Math.max(0, selectedCourseForBuy.price - data.discount_value);
      }

      await supabase
        .from('prepbuddy_coupons')
        .update({ uses_count: (data.uses_count || 0) + 1 })
        .eq('id', data.id);

      setCouponData(data);
      setDiscountedPrice(Math.round(finalPrice));
      setCouponStatus('valid');
    } catch (err) {
      console.error('Coupon error:', err);
      setCouponStatus('invalid');
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponStatus(null);
    setCouponData(null);
    setDiscountedPrice(null);
  };

  const handleBuyClick = (e, ts) => {
    e.stopPropagation();
    if (enrolledIds.has(ts.id)) {
      navigate(`/course/${ts.id}`);
      return;
    }
    
    if (ts.price > 0 && couponStatus !== 'valid') {
      setSelectedCourseForBuy(ts);
      setShowPromoDialog(true);
    } else {
      proceedToEnrollmentOrPayment(ts);
    }
  };

  const proceedToEnrollmentOrPayment = async (ts) => {
    const finalPrice = discountedPrice !== null ? discountedPrice : ts.price;
    
    if (finalPrice > 0) {
      navigate(`/payment/course/${ts.id}?price=${finalPrice}`);
      return;
    }

    setEnrollLoading(true);
    try {
      const userId = UserManager.getUserId();
      const { error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: userId, course_id: ts.id }]);
        
      if (error) throw error;
      setEnrolledIds(prev => new Set([...prev, ts.id]));
    } catch (err) {
      alert('Error enrolling: ' + err.message);
    } finally {
      setEnrollLoading(false);
      setShowPromoDialog(false);
      setSelectedCourseForBuy(null);
      removeCoupon();
    }
  };

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Extract free tests
        const freeCourse = data.find(c => c.title === 'INTERNAL_FREE_TEST_SECTION');
        const freeTestList = freeCourse ? (freeCourse.linked_tests || []) : [];
        if (freeTestList.length > 0) {
          setFreeTests(freeTestList);
          fetchQuestionCounts(freeTestList);
        }

        const filteredData = (data || []).filter(c => c.title !== 'INTERNAL_FREE_TEST_SECTION');
        
        const sortedData = filteredData.sort((a, b) => {
          if (a.is_popular && !b.is_popular) return -1;
          if (!a.is_popular && b.is_popular) return 1;
          return 0;
        });
        setTestSeries(sortedData);
      } catch (err) {
        console.error('Error fetching test series:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchEnrollments = async () => {
      const userId = UserManager.getUserId();
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('prepbuddy_enrollments')
          .select('course_id')
          .eq('user_id', userId);
        if (data) {
          setEnrolledIds(new Set(data.map(d => d.course_id)));
        }
      } catch (err) {
        console.error('Error fetching enrollments:', err);
      }
    };

    const fetchAttempts = async () => {
      const userId = UserManager.getUserId();
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('prepbuddy_test_attempts')
          .select('course_id, category, subcategory, score, total')
          .eq('user_id', userId);
        if (data) {
          const grouped = {};
          const freeMap = {};
          data.forEach(d => {
            const cId = d.course_id;
            if (!grouped[cId]) grouped[cId] = new Set();
            grouped[cId].add(`${d.category}-${d.subcategory}`);
            if (cId === 'free') {
              const key = `${d.category}-${d.subcategory}`;
              if (!freeMap[key] || d.score > freeMap[key].score) {
                freeMap[key] = d;
              }
            }
          });
          setAttemptsByCourse(grouped);
          setFreeAttemptsMap(freeMap);
        }
      } catch (err) {
        console.error('Error fetching attempts:', err);
      }
    };

    const fetchQuestionCounts = async (tests) => {
      if (!tests || tests.length === 0) return;
      try {
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
      } catch (err) {
        console.error('Error fetching question counts:', err);
      }
    };

    fetchTestSeries();
    fetchEnrollments();
    fetchAttempts();

    // Subscribe to new test series
    const channel = supabase
      .channel('test_series_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prepbuddy_test_series' },
        () => {
          fetchTestSeries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  const filteredTestSeries = testSeries.filter(ts => ts.title.toLowerCase().includes((searchQuery || '').toLowerCase()));
  const myTestSeries = filteredTestSeries.filter(ts => enrolledIds.has(ts.id));
  const finalTestSeries = onlyEnrolled ? myTestSeries : filteredTestSeries;

  const filteredFreeTests = freeTests.filter(ft => ft.subcategory.toLowerCase().includes((searchQuery || '').toLowerCase()) || ft.category.toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="p-4 space-y-4 pb-24">
      {!onlyEnrolled && (
        <>
          {/* Testimonials Carousel */}
          <TestimonialCarousel />

          {/* Free Test Series Section */}
          {freeTests.length > 0 && (
        <div className="pt-2 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-sm uppercase tracking-wider">Free</span>
              Tests To Try
            </h2>
          </div>
          <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 snap-x snap-mandatory hide-scrollbar">
            {filteredFreeTests.slice(0, 5).map((test, idx) => {
              const courseAttempts = attemptsByCourse['free'] || new Set();
              const key = `${test.category}-${test.subcategory}`;
              const isAttempted = courseAttempts.has(key);
              const attempt = freeAttemptsMap[key];
              const progressKey = `test_progress_${UserManager.getUserId()}_free_${test.category}_${test.subcategory}`;
              const isPaused = !!localStorage.getItem(progressKey);
              const qCount = questionCounts[`${test.category}-${test.subcategory}`] || 0;

              return (
                <div 
                  key={idx}
                  className="min-w-[240px] w-[240px] sm:min-w-[280px] bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col snap-start hover:shadow-md hover:border-emerald-200 transition-all"
                >
                  <div className="p-4 flex-1">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{test.category}</p>
                    <h3 className="font-bold text-gray-900 leading-tight mb-2 line-clamp-2">{test.subcategory}</h3>
                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-2 mb-1">
                      {qCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <span className="text-xs font-bold text-gray-600">{qCount} Qs</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <span className="text-xs font-bold text-gray-600">{test.time_limit ? `${test.time_limit} min` : 'No Limit'}</span>
                      </div>
                    </div>
                    {attempt && (
                      <div className="mt-2 flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-bold text-gray-500">Best Score</span>
                        <span className="text-sm font-black text-emerald-700">{attempt.score}<span className="text-xs font-medium text-gray-400">/{attempt.total}</span></span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5 border-t border-emerald-50 flex items-center gap-2">
                    {isAttempted ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/solution/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                          className="flex-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg transition-colors text-center"
                        >
                          VIEW ANALYSIS
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/test/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                          className={`flex-1 text-[10px] font-bold text-white px-2 py-1.5 rounded-lg transition-colors text-center ${ isPaused ? 'bg-secondary hover:bg-yellow-400 text-gray-900' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          {isPaused ? 'RESUME' : 'ATTEMPT AGAIN'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/test/free/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                        className="flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition-colors text-center"
                      >
                        {isPaused ? 'RESUME TEST' : 'ATTEMPT NOW →'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Show All tile */}
            {freeTests.length > 5 && (
              <div
                onClick={() => navigate('/free-tests')}
                className="min-w-[140px] w-[140px] bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center justify-center snap-start cursor-pointer hover:shadow-md transition-all active:scale-[0.98] p-4 gap-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
                </div>
                <p className="text-white font-black text-sm text-center leading-tight">See All {freeTests.length} Tests</p>
                <p className="text-white/70 text-[10px] font-medium">View all →</p>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* Section Title */}
      <div className="pt-2 pb-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {onlyEnrolled ? 'My Test Series' : 'Popular Test Series'}
        </h2>
      </div>

      {finalTestSeries.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p>{onlyEnrolled ? "You haven't enrolled in any test series yet." : "No test series found matching your search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {finalTestSeries.map((ts) => {
          const showFeatures = ts.title?.toLowerCase().includes('senior') || ts.title?.toLowerCase().includes('assistant') || ts.title?.toLowerCase().includes('asi') || true;

          let progressPercent = 0;
          if (enrolledIds.has(ts.id)) {
            const linkedTests = ts.linked_tests || [];
            const totalTests = linkedTests.length;
            if (totalTests > 0) {
              const courseAttempts = attemptsByCourse[ts.id] || new Set();
              const completedCount = linkedTests.filter(t => courseAttempts.has(`${t.category}-${t.subcategory}`)).length;
              progressPercent = Math.round((completedCount / totalTests) * 100);
            }
          }

          return (
            <div 
              key={ts.id} 
              onClick={() => navigate(`/course/${ts.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all active:scale-[0.99]"
            >
              <div className="relative">
                {ts.banner_url ? (
                  <img src={ts.banner_url} alt={ts.title} className="w-full h-48 md:h-52 object-contain bg-white" />
                ) : (
                  <div className="w-full h-48 md:h-52 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-100">
                    <span className="text-primary/40 font-bold text-base">{ts.title}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-bold text-base text-gray-900 leading-tight">{ts.title}</h3>
                {ts.description && (
                  <div className="text-xs text-gray-600 html-content line-clamp-3 overflow-hidden" dangerouslySetInnerHTML={{ __html: processHtml(ts.description) }} />
                )}

                {/* Compact test count summary */}
                {ts.linked_tests && ts.linked_tests.length > 0 && (() => {
                  const grouped = ts.linked_tests.reduce((acc, test) => {
                    if (!acc[test.category]) acc[test.category] = 0;
                    acc[test.category]++;
                    return acc;
                  }, {});
                  return (
                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
                      {Object.entries(grouped).map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                            <Layers size={11} className="text-gray-400" />
                            {cat}
                          </span>
                          <span className="text-xs font-bold text-[#0B2457] bg-indigo-50 px-2 py-0.5 rounded-full">{count} {count === 1 ? 'Test' : 'Tests'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                
                {/* Price row */}
                {!enrolledIds.has(ts.id) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {ts.price > 0 ? (
                      <>
                        <span className="font-black text-lg text-[#0B2457] flex items-center">
                          <IndianRupee size={15} className="mr-0" />{ts.price}
                        </span>
                        {ts.mrp && ts.mrp > ts.price && (
                          <>
                            <span className="text-sm text-gray-400 line-through flex items-center">
                              <IndianRupee size={12} className="mr-0" />{ts.mrp}
                            </span>
                            <span className="bg-green-100 text-green-700 font-black text-[10px] px-2 py-0.5 rounded-full">
                              {Math.round((ts.mrp - ts.price) / ts.mrp * 100)}% OFF
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="font-black text-lg text-emerald-600">FREE</span>
                    )}
                  </div>
                )}

                {/* Enrolled: progress + View Details */}
                {enrolledIds.has(ts.id) && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0 w-10 h-10">
                        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                            strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-emerald-600">
                          {progressPercent}%
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-800">Progress</p>
                        <p className="text-[9px] text-gray-400">{progressPercent === 100 ? 'Completed! 🎉' : 'Keep going!'}</p>
                      </div>
                    </div>
                    <button className="bg-[#0B2457] text-white font-bold py-2 px-4 rounded-xl text-xs active:scale-95 transition-transform">
                      View Details
                    </button>
                  </div>
                )}
              </div>

              {/* Full-width Buy Now button at bottom — non-enrolled only */}
              {!enrolledIds.has(ts.id) && (
                <div className="mt-auto">
                  <button
                    onClick={(e) => handleBuyClick(e, ts)}
                    className="w-full bg-[#0B2457] text-white font-bold py-3 text-sm active:scale-[0.98] transition-all shadow-sm"
                  >
                    {ts.price > 0 ? 'Buy Now' : 'Enroll Now'}
                  </button>
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}

      {/* Promo Code Dialog */}
      {showPromoDialog && selectedCourseForBuy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 relative">
            <button 
              onClick={() => {
                setShowPromoDialog(false);
                setSelectedCourseForBuy(null);
                removeCoupon();
              }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <XCircle size={24} />
            </button>
            <div className="mb-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Tag size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">Have a promo code?</h3>
              <p className="text-sm text-gray-500 mt-1">Enter it below to get a discount on {selectedCourseForBuy.title}.</p>
            </div>

            <div className="my-5">
              {couponStatus === 'valid' && couponData ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">{couponData.code} applied!</p>
                    <p className="text-xs text-green-600">
                      {couponData.discount_type === 'percentage'
                        ? `${couponData.discount_value}% off`
                        : `₹${couponData.discount_value} off`}
                      {' — '}New Price: <span className="font-black">₹{discountedPrice}</span>
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                    />
                    <button
                      onClick={verifyCoupon}
                      disabled={!couponCode.trim() || couponStatus === 'checking'}
                      className="bg-indigo-600 text-white font-bold px-4 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {couponStatus === 'checking' ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponStatus === 'invalid' && (
                    <p className="text-red-500 text-xs font-bold mt-2 ml-1">Invalid or expired promo code</p>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => proceedToEnrollmentOrPayment(selectedCourseForBuy)}
              disabled={enrollLoading}
              className="w-full bg-[#0B2457] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md"
            >
              {enrollLoading ? (
                'Processing...'
              ) : (
                <>
                  Proceed to Pay {discountedPrice !== null ? `₹${discountedPrice}` : `₹${selectedCourseForBuy.price}`}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
