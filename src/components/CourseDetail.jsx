import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, IndianRupee, Layers, FileText, CheckCircle2, Lock, Unlock, ChevronDown, ChevronUp, Tag, CheckCircle, XCircle, Languages, Newspaper, Award, Clock, Star, ShoppingCart, Share2, Sparkles, PartyPopper, ArrowRight, ShoppingBag, Eye, Download } from 'lucide-react';
import { UserManager } from '../utils/UserManager';
import { useAuthModal } from '../context/AuthModalContext';
import { processHtml } from '../utils/htmlUtils';
import CouponManager from './CouponManager';

const getMonthWeight = (name) => {
  const lowerName = name.toLowerCase();
  let year = 2024;
  const yearMatch = name.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }
  const monthOrder = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  let monthVal = 0;
  for (const [month, weight] of Object.entries(monthOrder)) {
    if (lowerName.includes(month)) {
      monthVal = weight;
      break;
    }
  }
  if (monthVal === 0) return 999999;
  return (year * 100) + monthVal;
};

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
  const [questionCounts, setQuestionCounts] = useState({});
  const [linkedResources, setLinkedResources] = useState([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'
  const [couponData, setCouponData] = useState(null);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  // Free enrollment custom modal states
  const [showFreeEnrollConfirm, setShowFreeEnrollConfirm] = useState(false);
  const [showFreeEnrollSuccess, setShowFreeEnrollSuccess] = useState(false);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => {
      if (!prev[cat]) {
        setTimeout(() => {
          const el = document.getElementById(`category-content-${cat}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return { [cat]: true };
      }
      return {};
    });
  };

  const [expandedSubgroups, setExpandedSubgroups] = useState({});
  const toggleSubgroup = (cat, subGroupName) => {
    setExpandedSubgroups(prev => {
      const key = `${cat}::${subGroupName}`;
      if (!prev[key]) {
        setTimeout(() => {
          const el = document.getElementById(`subgroup-${cat}-${subGroupName}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
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

        // Fetch question counts using EXACT API
        if (data && data.linked_tests && data.linked_tests.length > 0) {
          const counts = {};
          await Promise.all(data.linked_tests.map(async (test) => {
            const { count } = await supabase
              .from('prepbuddy_questions')
              .select('*', { count: 'exact', head: true })
              .eq('category', test.category)
              .eq('subcategory', test.subcategory);
            counts[`${test.category}-${test.subcategory}`] = count || 0;
          }));
          setQuestionCounts(counts);
        }

        // Fetch linked store items
        if (data && data.linked_store_items && data.linked_store_items.length > 0) {
          try {
            const { data: storeItemsData, error: storeError } = await supabase
              .from('prepbuddy_store')
              .select('*')
              .in('id', data.linked_store_items);
            if (!storeError && storeItemsData) {
              setLinkedResources(storeItemsData);
            }
          } catch (storeErr) {
            console.error('Error fetching linked store resources:', storeErr);
          }
        } else {
          setLinkedResources([]);
        }

      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [id, userId]);

  const [searchParams] = useSearchParams();

  const applyCoupon = async (codeToApply) => {
    const code = (typeof codeToApply === 'string' ? codeToApply : couponCode).trim().toUpperCase();
    if (!code) return;
    setCouponStatus('checking');
    setCouponData(null);
    setDiscountedPrice(null);

    try {
      const { data, error } = await supabase
        .from('prepbuddy_coupons')
        .select('*')
        .eq('resource_id', id)
        .eq('code', code)
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

      const basePrice = course?.price || 0;
      let finalPrice = basePrice;
      if (data.discount_type === 'percentage') {
        finalPrice = basePrice - (basePrice * data.discount_value / 100);
      } else {
        finalPrice = Math.max(0, basePrice - data.discount_value);
      }

      setCouponCode(code);
      setCouponData(data);
      setDiscountedPrice(Math.round(finalPrice));
      setCouponStatus('valid');
    } catch (err) {
      console.error('Coupon error:', err);
      setCouponStatus('invalid');
    }
  };

  // Auto-apply coupon from query param e.g. ?coupon=DISCOUNT20
  useEffect(() => {
    const queryCoupon = searchParams.get('coupon');
    if (queryCoupon && course && !isEnrolled) {
      applyCoupon(queryCoupon);
    }
  }, [searchParams, course, isEnrolled]);

  const removeCoupon = () => {
    setCouponCode('');
    setCouponStatus(null);
    setCouponData(null);
    setDiscountedPrice(null);
  };

  const { requireAuth } = useAuthModal();

  const handleBuyClick = () => {
    if (isEnrolled) return;
    requireAuth(() => {
      const finalPrice = discountedPrice !== null ? discountedPrice : course.price;
      if (finalPrice > 0 && couponStatus !== 'valid') {
        setShowPromoDialog(true);
      } else if (finalPrice === 0) {
        // Show custom confirm dialog before free enrollment
        setShowFreeEnrollConfirm(true);
      } else {
        proceedToEnrollmentOrPayment();
      }
    }, {
      title: 'Sign in to Enroll',
      description: 'Sign in to purchase or enroll in this test series and start taking tests.'
    });
  };

  const proceedToEnrollmentOrPayment = async () => {
    const finalPrice = discountedPrice !== null ? discountedPrice : course.price;
    
    if (finalPrice > 0) {
      const couponQuery = couponData?.id ? `&coupon=${encodeURIComponent(couponData.code)}&couponId=${encodeURIComponent(couponData.id)}` : '';
      navigate(`/payment/course/${id}?price=${finalPrice}${couponQuery}`);
      return;
    }

    setEnrollLoading(true);
    try {
      const { error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: userId, course_id: id }]);
        
      if (error && !error.message?.includes('duplicate')) throw error;

      // If a valid coupon was applied, increment uses_count
      if (couponData?.id) {
        await supabase
          .from('prepbuddy_coupons')
          .update({ uses_count: (couponData.uses_count || 0) + 1 })
          .eq('id', couponData.id);
      }

      setIsEnrolled(true);
      setShowFreeEnrollConfirm(false);
      setShowPromoDialog(false);
      // Trigger animated success dialog
      setShowFreeEnrollSuccess(true);
    } catch (err) {
      alert('Error enrolling: ' + err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleBack = () => {
    // If user opened this via direct shared link (history length <= 2 or referrer empty/external), navigate to homepage
    if (window.history.length <= 2 || !document.referrer || !document.referrer.includes(window.location.host)) {
      navigate('/', { replace: true });
    } else {
      navigate(-1);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const bannerUrl = course?.banner_url;

    // Try sharing with thumbnail image file if supported
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
          title: course?.title || 'Test Series',
          text: `Check out ${course?.title} on GoalPrep!\n${course?.description ? course.description.slice(0, 100) + '...' : ''}\n\n👉 Join here: ${shareUrl}`,
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
        <p className="text-gray-500 mb-4">Test Series not found.</p>
        <button onClick={handleBack} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const linkedTests = (course.linked_tests || []).filter(t => {
    // Always show coming_soon tests even if questions are not yet uploaded
    if (t.coming_soon) return true;
    // Hide tests deleted from the questions table (count will be 0 or missing)
    const count = questionCounts[`${t.category}-${t.subcategory}`];
    return count === undefined || count > 0; // show if count not yet loaded or has questions
  });
  
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
    <div className="min-h-full bg-app-bg pb-28 relative">
      {/* Header */}
      <header className="bg-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold ml-2 text-[#0B2457] line-clamp-1 flex-1">Test Series Details</h1>
        </div>
        <button
          onClick={handleShare}
          title="Share Test Series"
          className="p-2 rounded-xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200/80 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <Share2 size={17} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </header>

      {/* Top Banner & Nav */}
      <div className="relative w-full h-64 bg-gray-100 flex-shrink-0">
        {course.banner_url ? (
          <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
            <span className="text-white/20 font-bold text-3xl uppercase px-4 text-center">{course.title}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-5 pt-6 pb-8 -mt-6 bg-white rounded-t-3xl relative shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.15)] flex-1">
        
        {/* Title & Price */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {(() => {
              const isComingSoon = course.is_coming_soon || course.title?.toLowerCase().includes('coming soon') || course.description?.toLowerCase().includes('coming soon');
              return isComingSoon ? (
                <div className="inline-flex bg-orange-100 text-orange-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full items-center gap-1.5 shadow-sm border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Coming Soon
                </div>
              ) : (
                <div className="inline-flex bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Live
                </div>
              );
            })()}
            {Number(course.price) === 0 && (
              <div className="inline-flex bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full items-center gap-1 shadow-sm">
                Free
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg font-black text-[#0B2457] leading-tight flex-1">
              {course.title}
            </h1>
          {!isEnrolled && (
            <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
              {couponStatus === 'valid' && couponData ? (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 line-through flex items-center font-semibold">
                      <IndianRupee size={12} className="mr-0" />{course.price}
                    </span>
                    <div className="bg-emerald-600 text-white font-black px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap flex items-center text-sm">
                      <IndianRupee size={15} className="mr-0.5" />
                      {discountedPrice}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-600" />
                      {couponData.code} ({couponData.discount_type === 'percentage' ? `${couponData.discount_value}% OFF` : `₹${couponData.discount_value} OFF`})
                    </span>
                    <button 
                      onClick={removeCoupon} 
                      title="Remove coupon"
                      className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#0B2457] text-white font-bold px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap flex items-center">
                    {course.price > 0 ? (
                      <>
                        <IndianRupee size={16} className="mr-0.5" />
                        {course.price}
                      </>
                    ) : (
                      'Free'
                    )}
                  </div>
                  {course.mrp && course.mrp > course.price && (
                    <div className="flex items-center gap-1.5 mr-1">
                      <span className="text-xs text-gray-400 line-through flex items-center font-semibold">
                        <IndianRupee size={10} className="mr-0" />{course.mrp}
                      </span>
                      <span className="bg-green-100 text-green-700 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {Math.round((course.mrp - course.price) / course.mrp * 100)}% OFF
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
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
        {course.description && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100/90 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-600" />
              <span>About this Test Series</span>
            </h3>
            <div 
              className="text-gray-700 text-xs md:text-sm leading-relaxed html-content whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: processHtml(course.description) }}
            />
          </div>
        )}

        {/* Admin — Coupon Manager */}
        {UserManager.isAdmin() && (
          <div className="mb-6">
            <CouponManager 
              resourceId={id} 
              resourceTitle={course?.title} 
              resourcePrice={course?.price} 
              resourceBanner={course?.banner_url}
            />
          </div>
        )}

        {/* Included Tests Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary" />
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Test Series Contents</h2>
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
                    className={`flex flex-col items-center justify-center gap-2 text-center border p-3 rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] h-full transition-all ${
                      isExpanded 
                        ? `${color.bg} ${color.border} shadow-sm ring-1 ring-black/5` 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isExpanded ? color.iconBg : 'bg-gray-200 text-gray-400'} ${isExpanded ? 'text-white' : ''} shadow-sm transition-colors`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex flex-col gap-1 items-center justify-center h-full">
                      <div className={`font-bold text-sm leading-tight line-clamp-2 ${isExpanded ? 'text-gray-900' : 'text-gray-700'}`}>{category}</div>
                      <div className={`text-xs font-medium ${isExpanded ? 'text-gray-500' : 'text-gray-400'}`}>{tests.length} {tests.length === 1 ? 'Test' : 'Tests'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {linkedTests.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <p className="text-gray-500 font-medium text-sm">No tests have been added to this test series yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, tests]) => {
                if (!expandedCategories[cat]) return null;
                
                const subGroups = tests.reduce((acc, test) => {
                  const subGroupName = test.subcategory.includes('-') 
                    ? test.subcategory.split('-')[0].trim() 
                    : test.subcategory;
                  if (!acc[subGroupName]) acc[subGroupName] = [];
                  acc[subGroupName].push(test);
                  return acc;
                }, {});

                return (
                  <div key={cat} id={`category-content-${cat}`} style={{ scrollMarginTop: '80px' }} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h3 className="font-bold text-gray-900 pl-1">{cat} Topics</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(subGroups).sort((a, b) => getMonthWeight(a[0]) - getMonthWeight(b[0])).map(([subGroupName, groupTests]) => {
                        const isSubExpanded = expandedSubgroups[`${cat}::${subGroupName}`];
                        return (
                          <div key={subGroupName} id={`subgroup-${cat}-${subGroupName}`} style={{ scrollMarginTop: '80px' }} className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                            <div 
                              onClick={() => toggleSubgroup(cat, subGroupName)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                                  <Layers size={18} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900">{subGroupName}</h4>
                                  <p className="text-xs font-medium text-gray-500">{groupTests.length} {groupTests.length === 1 ? 'Test' : 'Tests'}</p>
                                </div>
                              </div>
                              <span className="text-gray-400 text-xs">
                                {isSubExpanded ? '▼' : '▶'}
                              </span>
                            </div>
                            
                            {isSubExpanded && (
                              <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-3">
                                {groupTests.sort((a, b) => a.subcategory.localeCompare(b.subcategory, undefined, { numeric: true, sensitivity: 'base' })).map((test, idx) => {
                        const attempt = attempts[`${test.category}-${test.subcategory}`];
                        const progressKey = `test_progress_${UserManager.getUserId()}_${course.id}_${test.category}_${test.subcategory}`;
                        const isPaused = !!localStorage.getItem(progressKey);
                        
                        const isComingSoon = test.coming_soon;
                        const canTake = isEnrolled && !isComingSoon;
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (isComingSoon) {
                                alert("This test is coming soon and will be unlocked shortly!");
                                return;
                              }
                              if (!attempt || isPaused) {
                                if (canTake) {
                                  requireAuth(() => {
                                    navigate(`/test/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`);
                                  }, {
                                    title: 'Sign in to Start Test',
                                    description: 'Sign in with your Google account to record your attempt, save progress, and see your rank.'
                                  });
                                } else {
                                  handleBuyClick();
                                }
                              }
                            }}
                            className={`flex flex-col gap-3 p-3 rounded-xl border ${canTake ? 'border-gray-100 hover:border-indigo-200 bg-white shadow-sm hover:shadow-md cursor-pointer' : 'border-gray-100 bg-gray-50/70 opacity-95 cursor-pointer'} transition-all group`}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <div className={`p-2 rounded-xl transition-colors shrink-0 ${isComingSoon ? 'bg-amber-50 text-amber-500' : (canTake ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600')}`}>
                                {isComingSoon ? <Clock size={18} /> : <FileText size={18} />}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className={`font-bold text-sm leading-tight ${canTake ? 'text-gray-900 group-hover:text-indigo-900' : 'text-gray-600'}`}>{test.subcategory}</h4>
                                  {test.is_free && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Free Test</span>
                                  )}
                                  {isComingSoon && (
                                    <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                      Coming Soon
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const qCount = questionCounts[`${test.category}-${test.subcategory}`] || test.totalQuestions;
                                  const dur = test.time_limit || test.duration;
                                  if (isComingSoon && !qCount && !dur) return null;
                                  return (
                                    <div className="flex items-center gap-1.5 mt-1.5 mb-0.5">
                                      {qCount ? (
                                        <>
                                          <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-500 mr-1.5">
                                            {qCount} Qs
                                          </span>
                                        </>
                                      ) : null}
                                      {dur ? (
                                        <>
                                          <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-500">
                                            {dur} min
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                                
                                {!attempt && !isPaused && !isComingSoon && (
                                  <div className="mt-2 flex items-center">
                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${canTake ? 'text-emerald-700 bg-emerald-100/70' : 'text-gray-600 bg-gray-200/70'}`}>
                                      {canTake ? (
                                        <>
                                          <Unlock size={10} strokeWidth={3} />
                                          TAKE TEST
                                        </>
                                      ) : (
                                        <>
                                          <Lock size={10} strokeWidth={3} />
                                          LOCKED (ENROLL TO UNLOCK)
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {isPaused && (
                                  <div className="mt-2 flex items-center">
                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${isEnrolled ? 'text-yellow-800 bg-yellow-100/70' : 'text-gray-500 bg-gray-200/60'}`}>
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
                                <div className="flex items-center justify-center gap-2 mt-1">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/solution/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className="px-4 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors text-center"
                                  >
                                    VIEW ANALYSIS
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/test/${course.id}/${encodeURIComponent(test.category)}/${encodeURIComponent(test.subcategory)}`); }}
                                    className={`px-4 py-1.5 text-[10px] font-bold text-white rounded-md transition-colors text-center ${isPaused ? 'bg-secondary hover:bg-yellow-400 text-gray-900' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Linked Store Items (Study Material & PDF Notes) */}
          {linkedResources.length > 0 && (
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 flex-shrink-0">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-gray-900 tracking-tight">Study Material & Notes</h3>
                    <p className="text-xs text-gray-500 font-medium truncate">Included PDF resources & reference guides for this course</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                  {linkedResources.length} {linkedResources.length === 1 ? 'Resource' : 'Resources'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedResources.map((res) => {
                  const canAccess = isEnrolled || Number(res.price) === 0;
                  return (
                    <div
                      key={res.id}
                      onClick={() => navigate(`/store/${res.id}`)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        canAccess
                          ? 'bg-white hover:bg-emerald-50/40 border-gray-200 hover:border-emerald-300 shadow-xs hover:shadow-md'
                          : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-18 rounded-xl overflow-hidden bg-white border border-gray-200/80 shadow-xs flex-shrink-0 relative">
                          {res.thumbnail_url ? (
                            <img src={res.thumbnail_url} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-1 text-center bg-gray-50">
                              <FileText size={20} className="mb-0.5 text-gray-400" />
                              <span className="text-[8px] font-bold">PDF</span>
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">
                            PDF
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                              Course Material
                            </span>
                            {Number(res.price) === 0 && (
                              <span className="text-[9px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">
                                Free
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-1 mt-1 group-hover:text-emerald-900 transition-colors">
                            {res.title}
                          </h4>
                          {res.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {res.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {canAccess ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                <Unlock size={11} strokeWidth={2.5} />
                                {isEnrolled ? 'UNLOCKED WITH COURSE' : 'FREE ACCESS'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-200/70 px-2 py-0.5 rounded-md">
                                <Lock size={11} strokeWidth={2.5} />
                                ENROLL TO UNLOCK
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/store/${res.id}`);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {canAccess && res.file_url && (
                          <a
                            href={res.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Buy/Enroll Dock (Offset by md:left-64 to exclude desktop sidebar) */}
      {!isEnrolled && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-3 md:p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-[1000px] mx-auto w-full px-2">
            <button 
              onClick={handleBuyClick}
              disabled={enrollLoading}
              className="w-full font-black py-3.5 md:py-4 rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2 bg-[#0B2457] text-white hover:bg-blue-900 active:scale-[0.99] disabled:opacity-70"
            >
              {enrollLoading ? 'Processing...' : ((discountedPrice !== null ? discountedPrice : course.price) === 0 ? <><Unlock size={18} /> Enroll Now for Free</> : <><ShoppingCart size={18} /> Buy Now — ₹{discountedPrice !== null ? discountedPrice : course.price}</>)}
            </button>
          </div>
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
              <p className="text-sm text-gray-500 mt-1">Enter it below to get a discount on this test series.</p>
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

      {/* Custom Modal: Confirm Free Enrollment */}
      {showFreeEnrollConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowFreeEnrollConfirm(false)} 
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
              You are about to enroll in <span className="font-bold text-gray-900">"{course.title}"</span>. This grants you full access to all mock tests, progress tracking, and leaderboard rankings at zero cost.
            </p>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setShowFreeEnrollConfirm(false)}
                disabled={enrollLoading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={proceedToEnrollmentOrPayment}
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
              Welcome aboard! All tests in <span className="font-bold text-gray-900">{course.title}</span> are now unlocked and ready for practice.
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
              onClick={() => setShowFreeEnrollSuccess(false)}
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
