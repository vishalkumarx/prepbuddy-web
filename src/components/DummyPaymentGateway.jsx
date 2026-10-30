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
  Info,
  MessageCircle
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

  const transactionNote = `${itemTitle.slice(0, 30)} Payment`.replace(/[^a-zA-Z0-9 ]/g, '');
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

      // Prepare WhatsApp message for admin
      const userName = UserManager.getName() || 'User';
      const userEmail = UserManager.getEmail() || 'Not provided';
      const adminPhone = '917888683399';
      const utrText = utrNumber?.trim() ? `\n*UTR / Ref No:* ${utrNumber.trim()}` : '';
      const waMessage = `*Payment Confirmation — GoalPrep*\n\n` +
        `👤 *User:* ${userName} (${userEmail})\n` +
        `📚 *Item:* ${itemTitle}\n` +
        `💰 *Amount Paid:* ₹${price}${utrText}\n` +
        `📅 *Time:* ${new Date().toLocaleString('en-IN')}\n\n` +
        `Please verify and confirm my test series access. Thank you!`;

      const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(waMessage)}`;

      // Open WhatsApp in new tab / app
      window.open(whatsappUrl, '_blank');

      setSuccess(true);
      setTimeout(() => {
        if (type === 'course') {
          navigate(`/course/${id}`);
        } else {
          navigate(-1);
        }
      }, 2000);
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
        <p className="text-gray-600 text-sm max-w-xs mb-3">
          Opening WhatsApp to notify admin (+91 78886 83399) and enrolling you in <span className="font-bold text-gray-900">{itemTitle}</span>.
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

            {/* UPI Supported Apps Logos / Badges */}
            <div className="mt-4 w-full flex flex-col items-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Supported Apps
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {/* Google Pay */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.9 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span className="text-xs font-bold text-gray-700">GPay</span>
                </div>

                {/* PhonePe */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <div className="w-4 h-4 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-black text-[10px] leading-none">
                    पे
                  </div>
                  <span className="text-xs font-bold text-gray-700">PhonePe</span>
                </div>

                {/* Paytm */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs hover:bg-gray-100/70 transition-colors">
                  <img src="/assets/paytm-logo.png" alt="Paytm" className="h-3.5 w-auto object-contain" />
                  <span className="text-xs font-bold text-gray-700">Paytm</span>
                </div>

                {/* BHIM UPI */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs hover:bg-gray-100/70 transition-colors">
                  <img src="/assets/bhim-logo.jpg" alt="BHIM" className="h-3.5 w-auto object-contain mix-blend-multiply" />
                  <span className="text-xs font-bold text-gray-700">BHIM</span>
                </div>

                {/* Other UPI */}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <span className="text-xs font-bold text-gray-600">+ Any UPI</span>
                </div>
              </div>
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
            <p className="text-[11px] text-center text-emerald-700 font-semibold mt-2 flex items-center justify-center gap-1.5 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100">
              <MessageCircle size={14} className="text-emerald-600" /> Opens WhatsApp to send payment proof to admin (+91 78886 83399)
            </p>
          </div>

          <p className="text-[11px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" /> Instant activation upon confirmation
          </p>

        </div>
      </div>
    </div>
  );
}
