import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { ArrowLeft, Download, ExternalLink, FileText, Tag, CheckCircle, XCircle } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[100dvh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh]">
        <h2 className="text-xl font-bold">Resource not found</h2>
        <button onClick={() => navigate('/store')} className="mt-4 text-primary">Go back to store</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center sticky top-0 z-20 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2 text-primary line-clamp-1 flex-1">Resource Details</h1>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Cover & Title */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="w-full bg-indigo-50/50 rounded-xl overflow-hidden mb-4 py-6 flex items-center justify-center relative aspect-[4/5] max-w-[200px] mx-auto">
             {/* Discount Banner */}
             {resource.original_price && resource.original_price > resource.price && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                  {Math.round(((resource.original_price - resource.price) / resource.original_price) * 100)}% OFF
                </div>
              )}
              {/* 3D Book Container */}
             <div 
               className="relative w-[120px] h-[170px] shadow-2xl rounded-sm"
               style={{
                 perspective: '1000px',
                 transformStyle: 'preserve-3d',
                 transform: 'rotateY(-15deg) rotateX(5deg)'
               }}
             >
               <img 
                 src={resource.thumbnail_url || "/book-mockup.jpg"} 
                 alt="Resource Cover" 
                 className="w-full h-full object-cover rounded-r-md border border-gray-200 absolute inset-0 bg-white"
               />
               <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-transparent to-transparent rounded-l-sm"></div>
               <div className="absolute inset-y-0 left-0 w-0.5 bg-white/40"></div>
               {/* Soft Copy Badge */}
               <div className="absolute bottom-2 right-0 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-l-md shadow-md tracking-wide uppercase">
                 📄 Soft Copy
               </div>
             </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 break-words">{resource.title}</h2>
          
          <div className="flex items-end gap-3 mb-4 border-b border-gray-100 pb-4">
            <span className={`text-2xl font-black ${resource.price === 0 ? 'text-green-600' : 'text-primary'}`}>
              {resource.price === 0 ? 'FREE' : `₹${resource.price}`}
            </span>
            {resource.original_price && resource.original_price > resource.price && (
              <span className="text-sm text-gray-400 line-through mb-1 font-semibold">₹{resource.original_price}</span>
            )}
          </div>

          {resource.description && (
            <div className="mt-1 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">About this resource</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{resource.description}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <button
            onClick={handleBuyClick}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-colors shadow-md active:scale-[0.98] ${
              (discountedPrice !== null ? discountedPrice : resource.price) === 0
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                : 'bg-primary text-white hover:bg-primary-light shadow-primary/20'
            }`}
          >
            {(discountedPrice !== null ? discountedPrice : resource.price) === 0 ? (
              <>
                <Download size={22} />
                Download Now for Free
              </>
            ) : (
              <>
                <ExternalLink size={22} />
                Buy Now{discountedPrice !== null ? ` — ₹${discountedPrice}` : resource.price > 0 ? ` — ₹${resource.price}` : ''}
              </>
            )}
          </button>
        </div>

        {/* Admin — Coupon Manager */}
        {UserManager.isAdmin() && (
          <CouponManager resourceId={id} />
        )}

        {/* Sample Pages */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
             <FileText className="text-primary" size={20} />
             Preview (First {Math.min(samplePages.length || 3, 3)} Pages)
           </h3>
           
           {loadingSamples ? (
             <div className="flex flex-col items-center justify-center py-10 space-y-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               <p className="text-sm text-gray-500">Generating preview...</p>
             </div>
           ) : sampleError ? (
             <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm">
               {sampleError}
             </div>
           ) : samplePages.length > 0 ? (
             <div className="space-y-4">
                {samplePages.map((pageDataUrl, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm relative group">
                    <img src={pageDataUrl} alt={`Sample Page ${index + 1}`} className="w-full h-auto" />
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                       Page {index + 1}
                    </div>
                  </div>
                ))}
             </div>
           ) : (
             <p className="text-gray-500 text-sm text-center py-6">No preview available.</p>
           )}
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
    </div>
  );
}
