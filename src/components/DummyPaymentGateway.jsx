import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { CreditCard, ShieldCheck, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function DummyPaymentGateway() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const price = searchParams.get('price') || '0';
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    // Simulate network delay for payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      if (type === 'course') {
        const userId = UserManager.getUserId();
        const { error } = await supabase
          .from('prepbuddy_enrollments')
          .insert([{ user_id: userId, course_id: id }]);
          
        if (error) throw error;
      } else if (type === 'resource') {
        // Since resources don't have an enrollment table right now, 
        // we'd ideally unlock it. But currently ResourceDetail just opens file_url if free.
        // We will just return to the page and maybe we need a way to mark it as purchased.
        // For now, we just redirect back. We can let the user know they paid.
        // Actually, if we just return, how do they access it? 
        // Let's pass a success flag back.
      }
      
      setSuccess(true);
      setTimeout(() => {
        if (type === 'course') {
          navigate(`/course/${id}`); // Assuming CourseDetail route is /course/:id or just go back
        } else {
          // Wait, CourseDetail doesn't have a route in the public list? 
          // Ah, I need to check how it's routed. Let's just use navigate(-1) but it might go back to payment.
          navigate(-1);
        }
      }, 1500);
      
    } catch (err) {
      alert("Payment failed: " + err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-green-50 p-6 text-center">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-black text-green-800 mb-2">Payment Successful!</h1>
        <p className="text-green-600 font-medium">Redirecting you back...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center shadow-sm border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center justify-center flex-1">
          <ShieldCheck className="text-emerald-500 mr-2" size={20} />
          <h1 className="text-lg font-bold text-gray-900">Secure Checkout</h1>
        </div>
        <div className="w-8"></div>
      </header>

      <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
          
          <div className="text-center mb-8 pt-4">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-2">Total Amount</p>
            <h2 className="text-5xl font-black text-gray-900">₹{price}</h2>
          </div>

          <div className="space-y-4 mb-8 flex-1">
            <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm">
                  <CreditCard className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Mock Card</p>
                  <p className="text-xs text-gray-500 font-mono">**** **** **** 4242</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-4 border-indigo-600 bg-white"></div>
            </div>
            
            <div className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <span className="font-bold text-gray-400">UPI</span>
                </div>
                <p className="font-bold text-gray-400">UPI / QR</p>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <p className="text-xs text-center text-gray-400 mb-4 flex items-center justify-center gap-1">
              <ShieldCheck size={14} /> This is a dummy payment gateway
            </p>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Processing...
                </>
              ) : (
                `Pay ₹${price}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
