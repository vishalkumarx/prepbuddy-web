import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, IndianRupee, Layers, FileText, CheckCircle2, Lock, Unlock, ChevronDown, ChevronUp, Tag, CheckCircle, XCircle, Languages, Newspaper, Award } from 'lucide-react';
import { UserManager } from '../utils/UserManager';
import CouponManager from './CouponManager';

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

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'
  const [couponData, setCouponData] = useState(null);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  const toggleCategory = (cat) => {
    setExpandedCategories({ [cat]: true });
  };

  useEffect(() => {
    if (course && course.linked_tests && course.linked_tests.length > 0 && Object.keys(expandedCategories).length === 0) {
      setExpandedCategories({ [course.linked_tests[0].category]: true });
    }
  }, [course, expandedCategories]);

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
            .eq('user_id', userId)
            .eq('course_id', id);
            
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

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('checking');
    setCouponData(null);
    setDiscountedPrice(null);

    try {
      const { data, error } = await supabase
        .from('prepbuddy_coupons')
        .select('*')
        .eq('resource_id', id)
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponStatus('invalid');
        return;
      }

      if (data.scope === 'single_user') {
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

      let finalPrice = course.price;
      if (data.discount_type === 'percentage') {
        finalPrice = course.price - (course.price * data.discount_value / 100);
      } else {
        finalPrice = Math.max(0, course.price - data.discount_value);
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

  const handleBuyClick = () => {
    if (isEnrolled) return;
    if (course.price > 0 && couponStatus !== 'valid') {
      setShowPromoDialog(true);
    } else {
      proceedToEnrollmentOrPayment();
    }
  };

  const proceedToEnrollmentOrPayment = async () => {
    const finalPrice = discountedPrice !== null ? discountedPrice : course.price;
    
    if (finalPrice > 0) {
      navigate(`/payment/course/${id}?price=${finalPrice}`);
      return;
    }

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
      setShowPromoDialog(false);
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
  const completedCount = linkedTests.filter(t => attempts[`${t.category}-${t.subcategory}`]).length;
  const progressPercent = totalTests > 0 ? Math.round((completedCount / totalTests) * 100) : 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg pb-[80px] overflow-y-auto">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-sm border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2 text-[#0B2457] line-clamp-1 flex-1">Course Details</h1>
      </header>

      {/* Top Banner & Nav */}
      <div className="relative w-full h-64 bg-gray-100 flex-shrink-0">
        {course.banner_url ? (
          <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
            <span className="text-white/20 font-bold text-4xl uppercase px-4 text-center">{course.title}</span>
          </div>
        )}

        {isEnrolled && (
          <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1.5 border border-emerald-400/50">
            <CheckCircle2 size={14} /> ENROLLED
          </div>
        )}
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
              <span className="text-sm font-black text-[#0B2457]">{completedCount} <span className="text-gray-400 font-bold text-xs">/ {totalTests} Completed</span></span>
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
        {!isEnrolled && course.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {course.description}
          </p>
        )}

        {/* Admin — Coupon Manager */}
        {UserManager.isAdmin() && (
          <div className="mb-6">
            <CouponManager resourceId={id} />
          </div>
        )}

        {/* Included Tests Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Course Contents</h2>
          </div>

          {/* Highlights Grid */}
          {linkedTests.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-3">
              {Object.entries(grouped).map(([category, tests], idx) => {
                const colors = [
                  { bg: 'bg-blue-50/70', border: 'border-blue-100/70', iconBg: 'bg-[#0B2457]', icon: Layers },
                  { bg: 'bg-amber-50/70', border: 'border-amber-100/70', iconBg: 'bg-amber-500', icon: Languages },
                  { bg: 'bg-purple-50/70', border: 'border-purple-100/70', iconBg: 'bg-purple-600', icon: Newspaper },
                  { bg: 'bg-emerald-50/70', border: 'border-emerald-100/70', iconBg: 'bg-emerald-600', icon: Award },
                ];
                const color = colors[idx % colors.length];
                const Icon = color.icon;
                const isExpanded = expandedCategories[category];
                
                return (
                  <div 
                    key={category} 
                    onClick={() => toggleCategory(category)}
                    className={`flex flex-col items-center justify-center gap-2 text-center border p-3 rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all ${
                      isExpanded 
                        ? `${color.bg} ${color.border} shadow-sm ring-1 ring-black/5` 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isExpanded ? color.iconBg : 'bg-gray-200 text-gray-400'} ${isExpanded ? 'text-white' : ''} shadow-sm transition-colors`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className={`font-black text-xl leading-none ${isExpanded ? 'text-gray-900' : 'text-gray-400'}`}>{tests.length}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 leading-tight line-clamp-2 ${isExpanded ? 'text-gray-700' : 'text-gray-400'}`}>{category}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {linkedTests.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <p className="text-gray-500 font-medium text-sm">No tests have been added to this course yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, tests]) => (
                expandedCategories[cat] && (
                  <div key={cat} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h3 className="font-bold text-gray-900 pl-1">{cat} Tests</h3>
                    <div className="space-y-3">
                      {tests.map((test, idx) => {
                        const attempt = attempts[`${test.category}-${test.subcategory}`];
                        const progressKey = `test_progress_${UserManager.getUserId()}_${course.id}_${test.category}_${test.subcategory}`;
                        const isPaused = !!localStorage.getItem(progressKey);
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (!attempt || isPaused) {
                                if (isEnrolled) {
                                  navigate(`/test/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`);
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
                                
                                {!attempt && !isPaused && (
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
                                
                                {isPaused && (
                                  <div className="mt-2 flex items-center">
                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${isEnrolled ? 'text-orange-700 bg-orange-100/70' : 'text-gray-500 bg-gray-200/60'}`}>
                                      {isEnrolled ? (
                                        <>
                                          <Unlock size={10} strokeWidth={3} />
                                          RESUME TEST
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
                                    onClick={(e) => { e.stopPropagation(); navigate(`/solution/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className="flex-1 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors text-center"
                                  >
                                    VIEW SOLUTIONS
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/test/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className={`flex-1 py-1.5 text-[10px] font-bold text-white rounded-md transition-colors text-center ${isPaused ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                  >
                                    {isPaused ? 'RESUME TEST' : 'ATTEMPT AGAIN'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buy/Start Button */}
      {!isEnrolled && (
        <div className="sticky bottom-0 w-full bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
          <button 
            onClick={handleBuyClick}
            disabled={enrollLoading}
            className="w-full font-bold py-4 rounded-xl text-base shadow-lg transition-all flex items-center justify-center gap-2 bg-[#0B2457] text-white hover:bg-blue-900 active:scale-[0.98]"
          >
            {enrollLoading ? 'Processing...' : ((discountedPrice !== null ? discountedPrice : course.price) === 0 ? 'Enroll Now for Free' : `Buy Now — ₹${discountedPrice !== null ? discountedPrice : course.price}`)}
          </button>
        </div>
      )}

      {/* Promo Code Dialog */}
      {showPromoDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 relative">
            <button onClick={() => setShowPromoDialog(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <XCircle size={24} />
            </button>
            <div className="mb-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Tag size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">Have a promo code?</h3>
              <p className="text-sm text-gray-500 mt-1">Enter it below to get a discount on this course.</p>
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
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                      placeholder="Enter code"
                      className={`flex-1 bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                        couponStatus === 'invalid' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponStatus === 'checking' || !couponCode.trim()}
                      className="bg-gray-900 text-white font-bold px-5 py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {couponStatus === 'checking' ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponStatus === 'invalid' && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
                      <XCircle size={12} /> Invalid or expired coupon code.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => proceedToEnrollmentOrPayment()} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors active:scale-95">
                Skip
              </button>
              <button 
                onClick={() => proceedToEnrollmentOrPayment()} 
                className="flex-[2] py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
              >
                {discountedPrice !== null ? `Pay ₹${discountedPrice}` : `Pay ₹${course.price}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
