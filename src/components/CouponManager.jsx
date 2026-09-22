import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, X } from 'lucide-react';

export default function CouponManager({ resourceId }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [scope, setScope] = useState('all');
  const [userEmail, setUserEmail] = useState('');
  const [maxUses, setMaxUses] = useState('unlimited'); // 'unlimited' | 'once'
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_coupons')
        .select('*')
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });
      if (!error) setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resourceId) fetchCoupons();
  }, [resourceId]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setCode(result);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) return;
    if (scope === 'single_user' && !userEmail.trim()) {
      alert('Please enter the user email for a single-user coupon.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('prepbuddy_coupons').insert([{
        resource_id: resourceId,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        scope,
        user_email: scope === 'single_user' ? userEmail.trim().toLowerCase() : null,
        is_active: true,
        max_uses: scope === 'single_user' && maxUses === 'once' ? 1 : null,
        uses_count: 0,
      }]);

      if (error) throw error;

      // Reset form
      setCode('');
      setDiscountValue('');
      setScope('all');
      setUserEmail('');
      setMaxUses('unlimited');
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error('Error creating coupon:', err);
      alert('Failed to create coupon: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    const { error } = await supabase
      .from('prepbuddy_coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);
    if (!error) fetchCoupons();
  };

  const deleteCoupon = async (couponId) => {
    if (!window.confirm('Delete this coupon?')) return;
    const { error } = await supabase
      .from('prepbuddy_coupons')
      .delete()
      .eq('id', couponId);
    if (!error) fetchCoupons();
  };

  const copyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-gray-800">Manage Coupons</h3>
          {coupons.length > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{coupons.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 border-b border-gray-100 bg-indigo-50/40 space-y-3">
          {/* Code */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Coupon Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                required
              />
              <button
                type="button"
                onClick={generateCode}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Discount Type + Value */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="percentage">% Off</option>
                <option value="fixed">₹ Fixed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-600 mb-1 block">
                Value ({discountType === 'percentage' ? '%' : '₹'})
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '50'}
                min="1"
                max={discountType === 'percentage' ? '100' : undefined}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Available For</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  scope === 'all'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => setScope('single_user')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  scope === 'single_user'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                Single User
              </button>
            </div>
          </div>

          {/* Email (single user only) */}
          {scope === 'single_user' && (
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">User Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          )}

          {/* Uses — only for single user coupons */}
          {scope === 'single_user' && (
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Usage Limit</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMaxUses('unlimited')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    maxUses === 'unlimited'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  ♾️ Unlimited
                </button>
                <button
                  type="button"
                  onClick={() => setMaxUses('once')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    maxUses === 'once'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  1️⃣ One-time
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>
      )}

      {/* Coupon List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <Tag size={24} className="mx-auto mb-2 opacity-40" />
            No coupons yet
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!coupon.is_active ? 'opacity-50' : ''}`}>
              {/* Top row: code + actions */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 tracking-widest text-sm bg-gray-100 px-2 py-0.5 rounded font-mono flex-1 truncate">
                  {coupon.code}
                </span>
                {/* Copy Button */}
                <button
                  onClick={() => copyCode(coupon.id, coupon.code)}
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    copiedId === coupon.id
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-primary hover:border-indigo-200'
                  }`}
                >
                  {copiedId === coupon.id ? (
                    <><Check size={12} /> Copied!</>
                  ) : (
                    <><Copy size={12} /> Copy</>
                  )}
                </button>
                {/* Toggle */}
                <button onClick={() => toggleActive(coupon)} className="text-gray-400 hover:text-primary transition-colors">
                  {coupon.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                </button>
                {/* Delete */}
                <button onClick={() => deleteCoupon(coupon.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              {/* Bottom row: details */}
              <p className="text-[11px] text-gray-500">
                {coupon.discount_type === 'percentage'
                  ? `${coupon.discount_value}% off`
                  : `₹${coupon.discount_value} off`}
                {' · '}
                {coupon.scope === 'single_user' ? `👤 ${coupon.user_email}` : '🌐 All users'}
                {' · '}
                {coupon.max_uses === 1
                  ? `1️⃣ One-time (${coupon.uses_count || 0} used)`
                  : `♾️ Unlimited (${coupon.uses_count || 0} used)`}
                {!coupon.is_active && ' · ⚪ Inactive'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
