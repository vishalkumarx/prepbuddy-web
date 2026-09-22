import React, { useState } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { X, ImagePlus, FileText, IndianRupee, Upload } from 'lucide-react';

export default function UploadTestSeries({ onClose, onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      let bannerUrl = null;

      // Upload banner image if provided
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop();
        const fileName = `ts_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('store_resources')
          .upload(fileName, bannerFile, { contentType: bannerFile.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('store_resources')
          .getPublicUrl(fileName);
        bannerUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('prepbuddy_test_series').insert([{
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        banner_url: bannerUrl,
        uploaded_by: UserManager.getUserId(),
      }]);

      if (error) throw error;

      alert('Test series published!');
      onUploaded?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to publish: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#0B2457]">Upload Test Series</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-10">
          {/* Banner Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Banner Image</label>
            <label className={`flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
              bannerPreview ? 'border-primary' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
            }`}>
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <ImagePlus size={32} />
                  <span className="text-sm font-medium">Tap to add banner image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              <FileText size={14} className="inline mr-1" />
              Test Series Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UPSC Mock Test Series 2025"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this test series include?"
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              <IndianRupee size={14} className="inline mr-1" />
              Price (0 for Free)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee size={16} className="text-gray-400" />
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors font-bold"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-[#0B2457] text-white font-bold py-4 rounded-xl text-base active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Publish Test Series
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
