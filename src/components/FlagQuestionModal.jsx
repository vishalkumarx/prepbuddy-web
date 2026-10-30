import React, { useState } from 'react';
import { Flag, X, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';

const REPORT_REASONS = [
  'Incorrect Answer Key',
  'Typo or Formatting Issue',
  'Ambiguous or Incomplete Question',
  'Incorrect Explanation',
  'Image Missing or Unclear',
  'Other Issue'
];

// Fallback UUID for system records if needed
const SYSTEM_FLAG_POST_ID = '7aced78e-9d9b-4015-b1b1-7f31bffd74ca';

export default function FlagQuestionModal({
  isOpen,
  onClose,
  question,
  questionNumber,
  category,
  subcategory
}) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !question) return null;

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMsg('');
    setDetails('');
    setSelectedReason(REPORT_REASONS[0]);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const userId = UserManager.getUserId();
    const username = UserManager.getUsername() || 'Anonymous User';

    const payload = {
      type: 'flag_question',
      question_id: question.id,
      question_number: questionNumber,
      question_text: (question.question || '').substring(0, 300),
      category: category ? decodeURIComponent(category) : (question.category || ''),
      subcategory: subcategory ? decodeURIComponent(subcategory) : (question.subcategory || ''),
      reason: selectedReason,
      details: details.trim(),
      user_id: userId,
      user_name: username,
      timestamp: new Date().toISOString()
    };

    try {
      // 1. First try storing in dedicated table `prepbuddy_question_flags` (if created)
      const { error: directError } = await supabase
        .from('prepbuddy_question_flags')
        .insert([{
          question_id: question.id,
          question_text: payload.question_text,
          category: payload.category,
          subcategory: payload.subcategory,
          reason: payload.reason,
          details: payload.details,
          user_id: payload.user_id,
          username: payload.user_name
        }]);

      if (directError) {
        // 2. Resilient cloud fallback: Store as system report comment in `prepbuddy_comments`
        const { error: commentError } = await supabase
          .from('prepbuddy_comments')
          .insert([{
            post_id: SYSTEM_FLAG_POST_ID,
            content: JSON.stringify(payload),
            username: `FLAG: ${username}`,
            device_id: userId
          }]);

        if (commentError) {
          console.error("Cloud flag error:", commentError);
        }
      }

      // Also persist to localStorage so user can see it has been reported
      try {
        const storedFlags = JSON.parse(localStorage.getItem('prepbuddy_reported_flags') || '[]');
        storedFlags.push({ ...payload, reported_at: Date.now() });
        localStorage.setItem('prepbuddy_reported_flags', JSON.stringify(storedFlags));
      } catch (e) {
        // ignore storage error
      }

      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      console.error("Submit flag error:", err);
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Flag size={18} className="text-white fill-white/20" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Flag Question</h3>
              <p className="text-[11px] text-white/80 font-medium">
                {questionNumber ? `Question #${questionNumber}` : 'Report Content to Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="font-black text-lg text-gray-900 mb-1">Report Submitted!</h4>
            <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
              Thank you for helping improve test quality. Our admin team will verify and resolve this issue promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Reason for reporting <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_REASONS.map((reason) => {
                  const isChecked = selectedReason === reason;
                  return (
                    <button
                      type="button"
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                        isChecked
                          ? 'border-rose-500 bg-rose-50/70 font-bold text-rose-900 shadow-xs'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 text-gray-700 font-medium'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? 'border-rose-600 bg-rose-600' : 'border-gray-400'}`}>
                        {isChecked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="truncate">{reason}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Additional Details <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <span className="text-[10px] text-gray-400">{details.length}/500</span>
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Explain what is incorrect or specify the correct answer/reference..."
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 bg-gray-50/40 text-gray-800 placeholder-gray-400 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Send to Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
