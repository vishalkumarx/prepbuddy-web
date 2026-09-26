import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { IndianRupee, Layers, Languages, Award, Newspaper, CheckCircle2, Tag, CheckCircle, XCircle, ArrowRight, Clock, Star } from 'lucide-react';
import TestimonialCarousel from './TestimonialCarousel';
import { UserManager } from '../utils/UserManager';

export default function StateHomeFeed() {
  const navigate = useNavigate();
  const [testSeries, setTestSeries] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [attemptsByCourse, setAttemptsByCourse] = useState({});
  const [loading, setLoading] = useState(true);

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
        const sortedData = (data || []).sort((a, b) => {
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
          .select('course_id, test_category, test_subcategory')
          .eq('user_id', userId);
        if (data) {
          const grouped = {};
          data.forEach(d => {
            if (!grouped[d.course_id]) grouped[d.course_id] = new Set();
            grouped[d.course_id].add(`${d.test_category}-${d.test_subcategory}`);
          });
          setAttemptsByCourse(grouped);
        }
      } catch (err) {
        console.error('Error fetching attempts:', err);
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

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Testimonials Carousel */}
      <TestimonialCarousel />

      {/* Section Title */}
      <div className="pt-2 pb-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Popular Courses</h2>
      </div>

      {testSeries.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p>No test series available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testSeries.map((ts) => {
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all active:scale-[0.99]"
            >
              <div className="relative">
                {ts.banner_url ? (
                  <img src={ts.banner_url} alt={ts.title} className="w-full h-48 md:h-52 object-contain bg-white" />
                ) : (
                  <div className="w-full h-48 md:h-52 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-100">
                    <span className="text-primary/40 font-bold text-base">{ts.title}</span>
                  </div>
                )}
                {enrolledIds.has(ts.id) && (
                  <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1.5 border border-emerald-400/50">
                    <CheckCircle2 size={14} /> ENROLLED
                  </div>
                )}
                {!enrolledIds.has(ts.id) && ts.is_popular && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1 border border-pink-400">
                    <Star size={14} fill="currentColor" /> POPULAR
                  </div>
                )}
                {ts.is_coming_soon && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1 border border-amber-400 animate-bounce">
                    <Clock size={14} /> COMING SOON
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-bold text-base text-gray-900 leading-tight">{ts.title}</h3>
                {ts.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{ts.description}</p>
                )}

                {/* Key Features List */}
                {ts.linked_tests && ts.linked_tests.length > 0 && (
                  <div className="my-2 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {Object.entries(
                      ts.linked_tests.reduce((acc, test) => {
                        if (!acc[test.category]) acc[test.category] = [];
                        acc[test.category].push(test);
                        return acc;
                      }, {})
                    ).map(([category, tests], idx) => {
                      const colors = [
                        { bg: 'bg-blue-50/70', border: 'border-blue-100/70', iconBg: 'bg-[#0B2457]', icon: Layers },
                        { bg: 'bg-amber-50/70', border: 'border-amber-100/70', iconBg: 'bg-amber-500', icon: Languages },
                        { bg: 'bg-purple-50/70', border: 'border-purple-100/70', iconBg: 'bg-purple-600', icon: Newspaper },
                        { bg: 'bg-emerald-50/70', border: 'border-emerald-100/70', iconBg: 'bg-emerald-600', icon: Award },
                      ];
                      const color = colors[idx % colors.length];
                      const Icon = color.icon;
                      
                      return (
                        <div key={category} className={`flex items-center gap-2.5 text-xs font-semibold text-gray-800 ${color.bg} border ${color.border} px-3 py-2 rounded-xl`}>
                          <div className={`p-1 rounded-lg ${color.iconBg} text-white flex-shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <span>{tests.length} {category} {tests.length === 1 ? 'Test' : 'Tests'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="mt-2 flex items-center justify-between">
                  {!enrolledIds.has(ts.id) && (
                    <span className="font-bold text-lg text-primary flex items-center">
                      {ts.price > 0 ? (
                        <>
                          <IndianRupee size={16} className="mr-0.5" />
                          {ts.price}
                        </>
                      ) : (
                        'Free'
                      )}
                    </span>
                  )}
                  <div className={`flex gap-2 ${enrolledIds.has(ts.id) ? 'w-full' : ''}`}>
                    {enrolledIds.has(ts.id) ? (
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0 w-12 h-12">
                          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.9" fill="none"
                              stroke="#10b981" strokeWidth="3"
                              strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dasharray 0.5s ease' }}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-emerald-600">
                            {progressPercent}%
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Your Progress</p>
                          <p className="text-[10px] text-gray-400">{progressPercent === 100 ? 'Completed! 🎉' : 'Keep going!'}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button className="bg-gray-100 text-gray-700 font-bold py-2 px-3 rounded-xl text-xs active:scale-95 transition-transform">
                          View Details
                        </button>
                        <button 
                          onClick={(e) => handleBuyClick(e, ts)}
                          className="bg-[#0B2457] text-white font-bold py-2 px-4 rounded-xl text-xs active:scale-95 transition-all shadow-md animate-pulse"
                        >
                          {ts.price > 0 ? 'Buy Now' : 'Enroll Now'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
