import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Plus, ArrowLeft, Image as ImageIcon, Smartphone, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BannerManager() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newBanner, setNewBanner] = useState({ link_url: '', mobileFile: null, desktopFile: null });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_banners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, path) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.mobileFile || !newBanner.desktopFile) {
      alert("Both mobile (1:1) and desktop (16:9) images are required.");
      return;
    }
    setUploading(true);
    try {
      const mobileUrl = await uploadFile(newBanner.mobileFile, 'mobile');
      const desktopUrl = await uploadFile(newBanner.desktopFile, 'desktop');

      const { data, error } = await supabase
        .from('prepbuddy_banners')
        .insert([{
          mobile_image_url: mobileUrl,
          desktop_image_url: desktopUrl,
          link_url: newBanner.link_url,
          is_active: true
        }])
        .select();

      if (error) throw error;
      setBanners([data[0], ...banners]);
      setNewBanner({ link_url: '', mobileFile: null, desktopFile: null });
      setShowAdd(false);
    } catch (err) {
      alert("Error adding banner: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await supabase.from('prepbuddy_banners').delete().eq('id', id);
      setBanners(banners.filter(b => b.id !== id));
    } catch (err) {
      alert("Error deleting banner: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center shadow-sm border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <ImageIcon className="ml-2 text-primary mr-2" size={20} />
        <h1 className="text-xl font-bold text-[#0B2457] flex-1">Banner Manager</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">Promotional Banners</h2>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors"
          >
            <Plus size={16} /> Add Banner
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAddBanner} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6 space-y-4">
            <h3 className="font-bold text-gray-900">Upload New Banner</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                <Smartphone size={16} className="text-gray-400" />
                Mobile Banner (1:1 Ratio)
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewBanner({...newBanner, mobileFile: e.target.files[0]})}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                <Monitor size={16} className="text-gray-400" />
                Web/Desktop Banner (16:9 Ratio)
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewBanner({...newBanner, desktopFile: e.target.files[0]})}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-700">Link URL (Optional)</label>
              <input 
                type="url" 
                value={newBanner.link_url}
                onChange={(e) => setNewBanner({...newBanner, link_url: e.target.value})}
                placeholder="https://example.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={uploading} className="flex-[2] py-2.5 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                {uploading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : 'Upload Banner'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
            <ImageIcon size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No promotional banners uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-1/3 aspect-video bg-gray-100 rounded-xl overflow-hidden relative">
                  <img src={banner.desktop_image_url} alt="Desktop Banner" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-bold">16:9</span>
                </div>
                <div className="w-full md:w-1/4 aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                  <img src={banner.mobile_image_url} alt="Mobile Banner" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-bold">1:1</span>
                </div>
                
                <div className="flex-1 w-full flex flex-row md:flex-col justify-between items-center md:items-end gap-2 mt-2 md:mt-0">
                  <div className="flex-1 text-xs text-gray-500 truncate max-w-[200px]">
                    {banner.link_url || 'No link'}
                  </div>
                  <button 
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete Banner"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
