import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { 
  ArrowLeft, Download, ExternalLink, FileText, Tag, CheckCircle, 
  XCircle, Share2, ShieldCheck, Zap, Sparkles, BookOpen, Layers, Clock,
  Maximize2, ChevronLeft, ChevronRight, ZoomIn, X
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import CouponManager from './CouponManager';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [samplePages, setSamplePages] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleError, setSampleError] = useState(null);
  const [totalPages, setTotalPages] = useState(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'
  const [couponData, setCouponData] = useState(null);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  const generateSamples = async (fileUrl) => {
    setLoadingSamples(true);
    setSampleError(null);
    try {
      // Fetch the PDF file
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);
      const numPages = Math.min(pdf.numPages, 3); // Max 3 pages for sample
      
      const pagesDataUrls = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        pagesDataUrls.push(dataUrl);
      }
      
      setSamplePages(pagesDataUrls);
    } catch (err) {
      console.error("Error generating PDF samples:", err);
      setSampleError("Failed to load PDF samples.");
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_store')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setResource(data);
        if (data && data.file_url) {
          generateSamples(data.file_url);
        }
      } catch (err) {
        console.error("Error fetching resource:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  const handleBuyClick = () => {
    if (resource.price > 0 && couponStatus !== 'valid') {
      setShowPromoDialog(true);
    } else {
      proceedToEnrollmentOrPayment();
    }
  };

  const proceedToEnrollmentOrPayment = () => {
    const finalPrice = discountedPrice !== null ? discountedPrice : resource.price;
    setShowPromoDialog(false);
    
    if (finalPrice === 0) {
      window.open(resource.file_url, '_blank');
    } else {
      navigate(`/payment/resource/${id}?price=${finalPrice}`);
    }
  };

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

      // Check single user scope
      if (data.scope === 'single_user') {
        const userEmail = UserManager.getEmail();
        if (!userEmail || userEmail.toLowerCase() !== data.user_email.toLowerCase()) {
          setCouponStatus('invalid');
          return;
        }
      }

      // Check usage limit
      if (data.max_uses !== null && (data.uses_count || 0) >= data.max_uses) {
        setCouponStatus('invalid');
        return;
      }

      // Calculate discounted price
      let finalPrice = resource.price;
      if (data.discount_type === 'percentage') {
        finalPrice = resource.price - (resource.price * data.discount_value / 100);
      } else {
        finalPrice = Math.max(0, resource.price - data.discount_value);
      }

      // Increment uses_count
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: resource?.title || 'GoalPrep Resource',
          text: `Check out "${resource?.title}" on GoalPrep Store!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[100dvh] bg-gray-50 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500 font-medium">Loading resource details...</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-gray-50 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <BookOpen size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Resource not found</h2>
        <p className="text-sm text-gray-500 mb-6">The study resource you requested could not be found or has been removed.</p>
        <button 
          onClick={() => navigate('/store')} 
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-opacity-95 transition-all"
        >
          Back to Store
        </button>
      </div>
    );
  }

  const isFree = resource.price === 0;
  const currentPrice = discountedPrice !== null ? discountedPrice : resource.price;
  const hasDiscount = resource.original_price && resource.original_price > resource.price;
  const discountPercent = hasDiscount 
    ? Math.round(((resource.original_price - resource.price) / resource.original_price) * 100) 
    : 0;

  const isCustomCover = resource.thumbnail_url && resource.thumbnail_url.includes('cover_');

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 via-white to-gray-50 pb-28 md:pb-20">
      {/* Sticky Top Bar */}
      <header className="bg-white/90 backdrop-blur-md px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 border-b border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-xs font-bold text-primary bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            GoalPrep Store
          </span>
        </div>

        <button 
          onClick={handleShare}
          className="p-2 text-gray-600 hover:text-primary rounded-xl hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Share Resource"
        >
          <Share2 size={18} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6">
        {/* Hero Section: Cover & Core Info */}
        <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-200/80 mb-6 relative overflow-hidden">
          {/* Subtle gradient aura backdrop */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start relative z-10">
            {/* Cover Column */}
            <div className="w-full md:w-auto flex flex-col items-center flex-shrink-0">
              <div className="w-full max-w-[280px] md:w-[270px] bg-gradient-to-b from-slate-100/80 to-indigo-50/50 rounded-2xl p-4 md:p-6 flex items-center justify-center relative aspect-[3/4] border border-gray-200/70 shadow-xs">
                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-xs z-20 flex items-center gap-1">
                    <Sparkles size={12} />
                    {discountPercent}% OFF
                  </div>
                )}

                {/* Cover Display: Flat for custom uploaded image, 3D Mockup for auto-extracted PDF */}
                {isCustomCover ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md border border-gray-200/90 bg-white">
                    <img 
                      src={resource.thumbnail_url} 
                      alt={resource.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2.5 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs tracking-wider uppercase">
                      📄 Soft Copy PDF
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative w-[185px] h-[260px] md:w-[200px] md:h-[280px] shadow-2xl rounded-sm transition-transform duration-300 hover:rotate-y-0"
                    style={{
                      perspective: '1200px',
                      transformStyle: 'preserve-3d',
                      transform: 'rotateY(-12deg) rotateX(4deg)'
                    }}
                  >
                    <img 
                      src={resource.thumbnail_url || "/book-mockup.jpg"} 
                      alt="Resource Cover" 
                      className="w-full h-full object-cover rounded-r border border-gray-200/90 absolute inset-0 bg-white shadow-sm"
                    />
                    <div className="absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/35 via-black/10 to-transparent rounded-l-sm"></div>
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-white/50"></div>
                    <div className="absolute bottom-2.5 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-l shadow-md tracking-wider uppercase">
                      📄 Soft Copy PDF
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 w-full flex flex-col">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Curated Notes
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <ShieldCheck size={14} />
                  Verified Study Material
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 break-words leading-tight tracking-tight">
                {resource.title}
              </h1>

              {/* Price Row */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-gray-200/70 mb-5 flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl md:text-4xl font-black ${isFree ? 'text-green-600' : 'text-primary'}`}>
                    {isFree ? 'FREE' : `₹${currentPrice}`}
                  </span>
                  {hasDiscount && (
                    <span className="text-base text-gray-400 line-through font-semibold">
                      ₹{resource.original_price}
                    </span>
                  )}
                </div>

                {hasDiscount && (
                  <span className="text-xs font-bold text-green-700 bg-green-100/90 px-2.5 py-1 rounded-lg">
                    Save ₹{resource.original_price - currentPrice}
                  </span>
                )}
              </div>

              {/* Quick Spec Highlights */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-center">
                  <FileText size={18} className="text-primary mx-auto mb-1" />
                  <span className="block text-[11px] text-gray-400 font-medium">Format</span>
                  <span className="text-xs font-bold text-gray-800">PDF E-Book</span>
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-center">
                  <Layers size={18} className="text-primary mx-auto mb-1" />
                  <span className="block text-[11px] text-gray-400 font-medium">Pages</span>
                  <span className="text-xs font-bold text-gray-800">{totalPages ? `${totalPages} Pages` : 'Complete'}</span>
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-center">
                  <Zap size={18} className="text-primary mx-auto mb-1" />
                  <span className="block text-[11px] text-gray-400 font-medium">Delivery</span>
                  <span className="text-xs font-bold text-gray-800">Instant Access</span>
                </div>
              </div>

              {/* Desktop CTA Button */}
              <div className="hidden md:block">
                <button
                  onClick={handleBuyClick}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all shadow-md active:scale-[0.99] ${
                    currentPrice === 0
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                      : 'bg-primary text-white hover:bg-primary-light shadow-primary/20'
                  }`}
                >
                  {currentPrice === 0 ? (
                    <>
                      <Download size={20} />
                      Download Resource for Free
                    </>
                  ) : (
                    <>
                      <ExternalLink size={20} />
                      Buy Resource — ₹{currentPrice}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        {resource.description && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200/80 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              About This Resource
            </h2>
            <div className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {resource.description}
            </div>
          </div>
        )}

        {/* Sample Pages Preview */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200/80 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-primary" size={20} />
              Look Inside (Sample Preview)
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              First {Math.min(samplePages.length || 3, 3)} Pages
            </span>
          </div>

          {loadingSamples ? (
            <div className="flex flex-col items-center justify-center py-14 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-xs text-gray-500 font-medium">Rendering PDF sample preview...</p>
            </div>
          ) : sampleError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-center text-xs font-semibold">
              {sampleError}
            </div>
          ) : samplePages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {samplePages.map((pageDataUrl, index) => (
                <div 
                  key={index} 
                  onClick={() => setActivePreviewIndex(index)}
                  className="rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs hover:shadow-lg transition-all relative bg-gray-50 group cursor-pointer hover:-translate-y-1"
                >
                  <img src={pageDataUrl} alt={`Sample Page ${index + 1}`} className="w-full h-auto object-cover" />
                  
                  {/* Page Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm">
                    Page {index + 1}
                  </div>

                  {/* Hover Overlay with Fullscreen Button */}
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white text-primary font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                      <ZoomIn size={15} />
                      <span>View Full Size</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Preview not available for this item.</p>
          )}
        </div>

        {/* Admin Coupon Control */}
        {UserManager.isAdmin() && (
          <div className="mb-6">
            <CouponManager resourceId={id} />
          </div>
        )}
      </div>

      {/* Mobile Floating Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3.5 z-40 shadow-lg pb-safe">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Price</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-black ${isFree ? 'text-green-600' : 'text-primary'}`}>
                {isFree ? 'FREE' : `₹${currentPrice}`}
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through">₹{resource.original_price}</span>
              )}
            </div>
          </div>

          <button
            onClick={handleBuyClick}
            className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
              currentPrice === 0 
                ? 'bg-green-600 text-white shadow-green-600/20' 
                : 'bg-primary text-white shadow-primary/20'
            }`}
          >
            {currentPrice === 0 ? (
              <>
                <Download size={17} />
                Get for Free
              </>
            ) : (
              <>
                <ExternalLink size={17} />
                Buy Now
              </>
            )}
          </button>
        </div>
      </div>

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
              <p className="text-sm text-gray-500 mt-1">Enter it below to get a discount on this resource.</p>
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
                {discountedPrice !== null ? `Pay ₹${discountedPrice}` : `Pay ₹${resource.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Size Sample Preview Modal / Lightbox */}
      {activePreviewIndex !== null && samplePages[activePreviewIndex] && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-3 md:p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActivePreviewIndex(null)}
        >
          {/* Lightbox Top Bar */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs md:text-sm bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md">
                Page {activePreviewIndex + 1} of {samplePages.length}
              </span>
              <span className="text-xs text-white/70 hidden sm:inline truncate max-w-sm">{resource.title}</span>
            </div>
            <button 
              onClick={() => setActivePreviewIndex(null)} 
              className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Close Preview (Esc)"
            >
              <X size={24} />
            </button>
          </div>

          {/* Lightbox Image Container & Chevrons */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden py-3" onClick={e => e.stopPropagation()}>
            {activePreviewIndex > 0 && (
              <button
                onClick={() => setActivePreviewIndex(prev => prev - 1)}
                className="absolute left-2 md:left-6 z-10 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all active:scale-95 shadow-lg border border-white/10"
                title="Previous Page"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <img 
              src={samplePages[activePreviewIndex]} 
              alt={`Full size sample page ${activePreviewIndex + 1}`} 
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none bg-white"
            />

            {activePreviewIndex < samplePages.length - 1 && (
              <button
                onClick={() => setActivePreviewIndex(prev => prev + 1)}
                className="absolute right-2 md:right-6 z-10 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all active:scale-95 shadow-lg border border-white/10"
                title="Next Page"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Lightbox Footer Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-2" onClick={e => e.stopPropagation()}>
            {samplePages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePreviewIndex(idx)}
                aria-label={`Jump to page ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  activePreviewIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
