import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  Copy, 
  Check, 
  ExternalLink,
  QrCode,
  Smartphone,
  Info
} from 'lucide-react';

const UPI_ID = '7888683399@pthdfc';
const PAYEE_NAME = 'Vishal Kumar';

export default function DummyPaymentGateway() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawPrice = searchParams.get('price') || '0';
  const price = Math.max(0, Number(rawPrice));

  const [itemTitle, setItemTitle] = useState('Course');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [showUtrField, setShowUtrField] = useState(false);

  // Fetch course or resource title
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        if (type === 'course') {
          const { data } = await supabase
            .from('prepbuddy_test_series')
            .select('title')
            .eq('id', id)
            .single();
          if (data?.title) setItemTitle(data.title);
        } else if (type === 'resource') {
          const { data } = await supabase
            .from('prepbuddy_resources')
            .select('title')
            .eq('id', id)
            .single();
          if (data?.title) setItemTitle(data.title);
        }
      } catch (err) {
        console.error('Error fetching title:', err);
      }
    };
    if (id) fetchTitle();
  }, [type, id]);

  // Clean note (spaces replaced with %20 by URLSearchParams or safe string)
  const transactionNote = `${itemTitle.slice(0, 30)} Payment`.replace(/[^a-zA-Z0-9 ]/g, '');
  
  // NPCI standard UPI URI
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${price}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmEnrollment = async () => {
    setLoading(true);
    try {
      if (type === 'course') {
        const userId = UserManager.getUserId();
        if (!userId) {
          alert('Please login to complete your enrollment.');
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('prepbuddy_enrollments')
          .insert([{ user_id: userId, course_id: id }]);

        if (error && !error.message?.includes('duplicate')) {
          throw error;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        if (type === 'course') {
          navigate(`/course/${id}`);
        } else {
          navigate(-1);
        }
      }, 1500);
    } catch (err) {
      alert('Enrollment failed: ' + err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-emerald-50 p-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Payment Confirmed!</h1>
        <p className="text-gray-600 text-sm max-w-xs mb-6">
          You have been successfully enrolled in <span className="font-bold text-gray-900">{itemTitle}</span>.
        </p>
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-4 py-2 rounded-full">
          Redirecting to your course...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 flex items-center justify-between shadow-xs border-b border-gray-200/80 sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="text-emerald-600" size={18} />
          <h1 className="text-sm font-bold text-gray-900">UPI Instant Checkout</h1>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
          Secure
        </span>
      </header>

      {/* Main Body */}
      <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 w-full flex flex-col">
          
          {/* Order Summary */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Item</p>
              <h2 className="text-sm font-bold text-gray-900 truncate">{itemTitle}</h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payable</p>
              <h3 className="text-2xl font-black text-emerald-600">₹{price}</h3>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500/20 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold py-1 uppercase tracking-widest text-center shadow-xs">
              Scan with any UPI App
            </div>

            <div className="mt-4 p-3.5 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
              <QRCodeSVG 
                value={upiIntentUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* UPI ID Row */}
            <div className="mt-4 w-full flex items-center justify-between bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs">
              <div className="text-left min-w-0">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">UPI ID</span>
                <span className="font-mono font-bold text-gray-800 text-xs truncate block">{UPI_ID}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUPI}
                className="flex items-center gap-1 font-bold text-[11px] bg-white border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 flex-shrink-0 ml-2"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Payee Info */}
            <p className="text-[11px] text-gray-500 mt-2 font-medium">
              Verified Payee: <span className="font-bold text-gray-800">{PAYEE_NAME}</span>
            </p>
          </div>

          {/* Mobile Tap-to-Pay Button */}
          <div className="mt-4 md:hidden">
            <a
              href={upiIntentUrl}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition-all"
            >
              <Smartphone size={18} />
              Open in GPay / PhonePe / Paytm
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Verification section */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Info size={14} className="text-emerald-600" /> After completing payment:
              </span>
              <button 
                type="button" 
                onClick={() => setShowUtrField(!showUtrField)}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                {showUtrField ? 'Hide UTR' : '+ Add UTR (Optional)'}
              </button>
            </div>

            {showUtrField && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Enter 12-digit UPI / UTR Ref number"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                />
              </div>
            )}

            <button
              onClick={handleConfirmEnrollment}
              disabled={loading}
              className="w-full bg-[#0B2457] hover:bg-[#07193d] text-white font-black text-sm py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Verifying & Enrolling...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  I have Completed Payment (₹{price})
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" /> Instant activation upon confirmation
          </p>

        </div>
      </div>
    </div>
  );
}
