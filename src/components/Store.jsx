import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, FileText, Download, ExternalLink, Edit2 } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';

export default function Store() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_store')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error("Error fetching store resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (resource) => {
    if (resource.price === 0) {
      window.open(resource.file_url, '_blank');
    } else {
      alert(`Payment gateway coming soon for ₹${resource.price}!`);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 pb-20">
      {/* Header Area */}
      <div className="bg-primary px-6 py-8 rounded-b-[2rem] shadow-sm relative mb-6">
        <div className="flex items-center justify-center gap-3">
          <ShoppingBag className="text-secondary" size={28} />
          <h2 className="text-white text-2xl font-bold">Store</h2>
        </div>
        <p className="text-white/80 text-center text-sm mt-2">Premium PDF Resources for your preparation</p>
      </div>

      {/* Resource List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <ShoppingBag size={32} className="text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No resources yet</h3>
            <p className="text-gray-500 text-sm mt-2">Check back later for new study materials!</p>
          </div>
        ) : (
          resources.map((resource) => (
            <div key={resource.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 transition-transform hover:scale-[1.02]">
              <div className="w-full bg-indigo-50/50 rounded-xl overflow-hidden mb-3 py-6 flex items-center justify-center relative">
                {/* Discount Banner */}
                {resource.original_price && resource.original_price > resource.price && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10 animate-[fadeIn_0.3s_ease-out]">
                    {Math.round(((resource.original_price - resource.price) / resource.original_price) * 100)}% OFF
                  </div>
                )}
                {/* 3D Book Container */}
                <div 
                  className="relative w-[140px] h-[190px] shadow-2xl rounded-sm transition-transform duration-300 hover:rotate-y-0"
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
                  {/* Book Spine Overlay */}
                  <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-transparent to-transparent rounded-l-sm"></div>
                  <div className="absolute inset-y-0 left-0 w-0.5 bg-white/40"></div>
                  
                  {/* Title Fallback Overlay (in case thumbnail fails) */}
                  {!resource.thumbnail_url && (
                     <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <h3 className="text-white text-xs font-bold leading-tight line-clamp-3">{resource.title}</h3>
                     </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start gap-4 px-1">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1.5">{resource.title}</h3>
                  {resource.description && (
                     <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                  )}
                </div>
                {UserManager.isAdmin() && (
                  <Link 
                    to={`/edit-resource/${resource.id}`}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <Edit2 size={18} />
                  </Link>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Price</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${resource.price === 0 ? 'text-green-600' : 'text-primary'}`}>
                      {resource.price === 0 ? 'FREE' : `₹${resource.price}`}
                    </span>
                    {resource.original_price && resource.original_price > resource.price && (
                      <span className="text-sm text-gray-400 line-through">₹{resource.original_price}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAction(resource)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    resource.price === 0 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-primary text-white hover:bg-primary-light'
                  }`}
                >
                  {resource.price === 0 ? (
                    <>
                      <Download size={16} />
                      Download
                    </>
                  ) : (
                    <>
                      <ExternalLink size={16} />
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
