import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchContext } from '../App';
import { supabase } from '../supabase';
import { IndianRupee, Layers, Languages, Award, Newspaper, CheckCircle2, Tag, CheckCircle, XCircle, ArrowRight, Clock, Star, ShoppingCart, Unlock, Share2, Sparkles, PartyPopper, GraduationCap, Check } from 'lucide-react';
import TestimonialCarousel from './TestimonialCarousel';
import { UserManager } from '../utils/UserManager';
import { useAuthModal } from '../context/AuthModalContext';
import { processHtml } from '../utils/htmlUtils';

export default function StateHomeFeed({ onlyEnrolled = false }) {
  const navigate = useNavigate();
  const { requireAuth } = useAuthModal();
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

  // Free enrollment modal states
  const [showFreeEnrollConfirm, setShowFreeEnrollConfirm] = useState(false);
  const [showFreeEnrollSuccess, setShowFreeEnrollSuccess] = useState(false);
  const [enrolledCourseTitle, setEnrolledCourseTitle] = useState('');

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

      // Note: Do not pre-increment uses_count here before actual payment/enrollment!
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

    requireAuth(() => {
      setSelectedCourseForBuy(ts);
      const finalPrice = discountedPrice !== null ? discountedPrice : ts.price;
      if (finalPrice > 0 && couponStatus !== 'valid') {
        setShowPromoDialog(true);
      } else if (finalPrice === 0) {
        setShowFreeEnrollConfirm(true);
      } else {
        proceedToEnrollmentOrPayment(ts);
      }
    }, {
      title: 'Sign in to Enroll',
      description: 'Sign in with your Google account to enroll in test series and track your scores.'
    });
  };

  const proceedToEnrollmentOrPayment = async (ts) => {
    const finalPrice = discountedPrice !== null ? discountedPrice : ts.price;
    
    if (finalPrice > 0) {
      const couponQuery = couponData?.id ? `&coupon=${encodeURIComponent(couponData.code)}&couponId=${encodeURIComponent(couponData.id)}` : '';
      navigate(`/payment/course/${ts.id}?price=${finalPrice}${couponQuery}`);
      return;
    }

    setEnrollLoading(true);
    try {
      const userId = UserManager.getUserId();
      const { error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: userId, course_id: ts.id }]);
        
      if (error && !error.message?.includes('duplicate')) throw error;
      setEnrolledIds(prev => new Set([...prev, ts.id]));
      setEnrolledCourseTitle(ts.title);
      setShowFreeEnrollConfirm(false);
      setShowPromoDialog(false);
      removeCoupon();
      // Show animated celebration dialog
      setShowFreeEnrollSuccess(true);
    } catch (err) {
      alert('Error enrolling: ' + err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleShare = async (e, ts) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/course/${ts.id}`;
    const bannerUrl = ts.banner_url;

    if (navigator.share) {
      try {
        let filesArray = [];
        if (bannerUrl && navigator.canShare) {
          try {
            const res = await fetch(bannerUrl);
            const blob = await res.blob();
            const file = new File([blob], 'test_series_thumbnail.png', { type: blob.type || 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              filesArray = [file];
            }
          } catch (fileErr) {
            console.log('Thumbnail fetch for share skipped:', fileErr);
          }
        }

        const sharePayload = {
          title: ts.title,
          text: `Check out ${ts.title} on GoalPrep!\n${ts.description ? ts.description.slice(0, 100) + '...' : ''}\n\n👉 Join here: ${shareUrl}`,
          url: shareUrl
        };

        if (filesArray.length > 0) {
          sharePayload.files = filesArray;
        }

        await navigator.share(sharePayload);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
        }
        return;
      }
    }

    navigator.clipboard.writeText(shareUrl);
    alert('Course link copied to clipboard!');
  };

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Extract free tests and validate they still exist in the questions table
        const freeCourse = data.find(c => c.title === 'INTERNAL_FREE_TEST_SECTION');
        const freeTestList = freeCourse ? (freeCourse.linked_tests || []) : [];
        if (freeTestList.length > 0) {
          const counts = await Promise.all(
            freeTestList.map(async (t) => {
              const { count } = await supabase
                .from('prepbuddy_questions')
                .select('*', { count: 'exact', head: true })
                .eq('category', t.category)
                .eq('subcategory', t.subcategory);
              return { test: t, count: count || 0 };
            })
          );
          const validTests = counts.filter(r => r.count > 0).map(r => r.test);
          setFreeTests(validTests);
          fetchQuestionCounts(validTests);
        }

        const filteredData = (data || []).filter(c => !c.title?.startsWith('INTERNAL_'));
        
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
        // Fetch free course ID to correctly map free attempts
        const { data: freeCourse } = await supabase
          .from('prepbuddy_test_series')
          .select('id')
          .eq('title', 'INTERNAL_FREE_TEST_SECTION')
          .single();
        const freeCourseId = freeCourse?.id;

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
            
            // Map free attempts by checking if cId matches freeCourseId or 'free' (legacy)
            if (cId === 'free' || cId === freeCourseId) {
              const key = `${d.category}-${d.subcategory}`;
              if (!freeMap[key] || d.score > freeMap[key].score) {
                freeMap[key] = d;
              }
              // Also add to 'free' group so UI works without changes
              if (!grouped['free']) grouped['free'] = new Set();
              grouped['free'].add(`${d.category}-${d.subcategory}`);
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

  const isTsComingSoon = (ts) => ts.is_coming_soon || ts.title?.toLowerCase().includes('coming soon') || ts.description?.toLowerCase().includes('coming soon');
  const finalTestSeriesRegular = finalTestSeries.filter(ts => !isTsComingSoon(ts));
  const finalTestSeriesComingSoon = finalTestSeries.filter(ts => isTsComingSoon(ts));

  const filteredFreeTests = freeTests.filter(ft => ft.subcategory.toLowerCase().includes((searchQuery || '').toLowerCase()) || ft.category.toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="p-4 space-y-4 pb-24">
      {!onlyEnrolled && (
        <>
          {/* Testimonials Carousel */}
          <TestimonialCarousel />
        </>
      )}

      {/* Section Title */}
      <div className="pt-2 pb-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {onlyEnrolled ? 'My Test Series' : 'Popular Test Series'}
        </h2>
      </div>

      {finalTestSeriesRegular.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p>{onlyEnrolled ? "You haven't enrolled in any test series yet." : "No test series found matching your search."}</p>
        </div>
      ) : (
        (() => {
          const splitIndex = onlyEnrolled || finalTestSeriesRegular.length <= 1 
            ? finalTestSeriesRegular.length 
            : Math.min(2, Math.ceil(finalTestSeriesRegular.length / 2));
          const firstBatch = finalTestSeriesRegular.slice(0, splitIndex);
          const secondBatch = finalTestSeriesRegular.slice(splitIndex);

          const renderCourseCard = (ts) => {
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
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const isComingSoon = isTsComingSoon(ts);
                        return isComingSoon ? (
                          <div className="self-start bg-orange-100 text-orange-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-orange-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Coming Soon
                          </div>
                        ) : (
                          <div className="self-start bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Live
                          </div>
                        );
                      })()}
                      {Number(ts.price) === 0 && (
                        <div className="self-start bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          Free
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, ts)}
                      title="Share Test Series"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 border border-gray-200/80 active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
                    >
                      <Share2 size={15} />
                    </button>
                  </div>
                  <h3 className="font-bold text-base text-gray-900 leading-tight">{ts.title}</h3>
                  {ts.description && (
                    <div className="text-xs text-gray-600 html-content line-clamp-3 overflow-hidden" dangerouslySetInnerHTML={{ __html: processHtml(ts.description) }} />
                  )}

                  {/* Action Row: Price or Progress + View Details */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {enrolledIds.has(ts.id) ? (
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
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-lg text-[#0B2457] flex items-center">
                          <IndianRupee size={15} className="mr-0" />{ts.price ?? 0}
                        </span>
                        {Number(ts.mrp) > Number(ts.price || 0) && (
                          <>
                            <span className="text-sm text-gray-400 line-through flex items-center">
                              <IndianRupee size={12} className="mr-0" />{ts.mrp}
                            </span>
                            <span className="bg-green-100 text-green-700 font-black text-[10px] px-2 py-0.5 rounded-full">
                              {Math.round(((Number(ts.mrp) - Number(ts.price || 0)) / Number(ts.mrp)) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <button className="bg-[#0B2457] text-white font-bold py-2 px-4 rounded-xl text-xs active:scale-95 transition-transform flex-shrink-0">
                      View Details
                    </button>
                  </div>
                </div>

                {/* Full-width Buy Now button at bottom — non-enrolled only */}
                {!enrolledIds.has(ts.id) && (
                  <div className="mt-auto">
                    <button
                      onClick={(e) => handleBuyClick(e, ts)}
                      className="w-full bg-[#0B2457] text-white font-bold py-3 text-sm active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {ts.price > 0 ? <><ShoppingCart size={16} /> Buy Now</> : <><Unlock size={16} /> Enroll Now</>}
                    </button>
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {/* First Batch of Courses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firstBatch.map(renderCourseCard)}
              </div>

              {/* OUR FACULTY SPOTLIGHT SECTION (Between Courses) */}
              {!onlyEnrolled && (
                <div className="my-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2457] via-[#0E2C6A] to-[#123884] p-5 sm:p-7 md:p-8 text-white shadow-xl border border-blue-900/60">
                  {/* Subtle decorative background elements */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-yellow-400/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16"></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Faculty Profile Image */}
                    <div className="relative flex-shrink-0 group">
                      <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-yellow-200 to-yellow-500 shadow-2xl">
                        <img 
                          src="/assets/faculty-sanjeev-banotra.jpg" 
                          alt="Sanjeev Banotra - Faculty Member at GoalPrep.in" 
                          className="w-full h-full object-cover rounded-full select-none"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="bg-[#0B2457] border border-yellow-400/80 text-yellow-300 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <GraduationCap size={13} className="text-yellow-400" /> Lead Mentor
                        </span>
                      </div>
                    </div>

                    {/* Faculty Info & Highlights */}
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-yellow-300 text-xs font-bold uppercase tracking-widest mb-2.5">
                        <Sparkles size={13} className="text-yellow-400" />
                        <span>Meet Our Faculty</span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                        Sanjeev Banotra
                      </h3>
                      <p className="text-yellow-400 font-bold text-sm sm:text-base mt-0.5">
                        Senior Faculty Member at GoalPrep.in
                      </p>

                      <p className="text-white/80 text-xs sm:text-sm mt-3 leading-relaxed max-w-xl">
                        Dedicated to mentoring aspirants for Punjab & Northern region state government competitive exams. Expert curated mock test series, comprehensive analysis, and high-yield question patterns designed to get you exam-ready.
                      </p>

                      {/* Credentials Badges */}
                      <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-white">
                          <Check size={14} className="text-emerald-400 stroke-[3]" /> Exam-Pattern Specialist
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-white">
                          <Award size={14} className="text-yellow-400" /> Punjab Govt. Exam Focus
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-white">
                          <Star size={14} className="text-amber-300 fill-amber-300" /> Teaching Experience
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Second Batch of Courses */}
              {secondBatch.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secondBatch.map(renderCourseCard)}
                </div>
              )}
            </>
          );
        })()
      )}

      {/* Coming Soon Section */}
      {!onlyEnrolled && finalTestSeriesComingSoon.length > 0 && (
        <>
          <div className="pt-8 pb-1">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Coming Soon
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalTestSeriesComingSoon.map((ts) => {
              return (
                <div 
                  key={ts.id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full"
                >
                  <div className="relative">
                    {ts.banner_url ? (
                      <img src={ts.banner_url} alt={ts.title} className="w-full h-48 md:h-52 object-contain bg-white" />
                    ) : (
                      <div className="w-full h-48 md:h-52 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-100">
                        <span className="text-gray-400 font-bold text-base">{ts.title}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col gap-2">
                    <div className="self-start bg-orange-100 text-orange-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-orange-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      Coming Soon
                    </div>
                    <h3 className="font-bold text-base text-gray-900 leading-tight">{ts.title}</h3>
                    {ts.description && (
                      <div className="text-xs text-gray-600 html-content line-clamp-3 overflow-hidden" dangerouslySetInnerHTML={{ __html: processHtml(ts.description) }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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

      {/* Custom Modal: Confirm Free Enrollment */}
      {showFreeEnrollConfirm && selectedCourseForBuy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowFreeEnrollConfirm(false);
                setSelectedCourseForBuy(null);
              }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <XCircle size={22} />
            </button>
            
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
              <Sparkles size={32} className="animate-spin-slow" />
            </div>

            <div className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-2">
              100% Free Access
            </div>

            <h3 className="text-xl font-black text-gray-900 leading-tight">Enroll in Free Test Series?</h3>
            <p className="text-xs text-gray-500 mt-2 px-2 leading-relaxed">
              You are about to enroll in <span className="font-bold text-gray-900">"{selectedCourseForBuy.title}"</span>. Full access to mock tests, solutions, and progress tracking at zero cost.
            </p>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => {
                  setShowFreeEnrollConfirm(false);
                  setSelectedCourseForBuy(null);
                }}
                disabled={enrollLoading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={() => proceedToEnrollmentOrPayment(selectedCourseForBuy)}
                disabled={enrollLoading}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {enrollLoading ? (
                  <span>Enrolling...</span>
                ) : (
                  <>
                    <Unlock size={16} />
                    <span>Confirm & Enroll</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Animated Celebration Dialog Afterwards Enrolling */}
      {showFreeEnrollSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 md:p-8 shadow-2xl relative text-center border border-gray-100 animate-in zoom-in-90 duration-300">
            {/* Animated Celebration Icon with Ping effect */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping"></span>
              <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <PartyPopper size={38} className="animate-bounce" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 leading-tight">You're Enrolled! 🎉</h3>
            <p className="text-xs text-gray-600 mt-2 px-1 leading-relaxed">
              Welcome aboard! All tests in <span className="font-bold text-gray-900">{enrolledCourseTitle || 'Test Series'}</span> are now unlocked and ready for practice.
            </p>

            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 my-5 text-left flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-950">Free Unlimited Access Activated</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">Attempt anytime, pause and resume progress, and review detailed solutions.</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowFreeEnrollSuccess(false);
                if (selectedCourseForBuy?.id) {
                  navigate(`/course/${selectedCourseForBuy.id}`);
                }
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Start Practicing Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
