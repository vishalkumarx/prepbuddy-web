import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, FileText, Download, ExternalLink, Edit2 } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';

export default function Store() {
  const navigate = useNavigate();
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
      <div className="px-4 grid grid-cols-2 gap-4 mb-20">
        {loading ? (
          <div className="col-span-2 flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <ShoppingBag size={32} className="text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No resources yet</h3>
            <p className="text-gray-500 text-sm mt-2">Check back later for new study materials!</p>
          </div>
        ) : (
          resources.map((resource) => (
            <div 
              key={resource.id} 
              onClick={() => navigate(`/store/${resource.id}`)}
              className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2 transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-full bg-indigo-50/50 rounded-xl overflow-hidden mb-2 py-4 flex items-center justify-center relative aspect-[4/5]">
                {/* Discount Banner */}
                {resource.original_price && resource.original_price > resource.price && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 animate-[fadeIn_0.3s_ease-out]">
                    {Math.round(((resource.original_price - resource.price) / resource.original_price) * 100)}% OFF
                  </div>
                )}
                {/* 3D Book Container */}
                <div 
                  className="relative w-[90px] h-[125px] shadow-xl rounded-sm transition-transform duration-300 hover:rotate-y-0"
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
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 via-transparent to-transparent rounded-l-sm"></div>
                  <div className="absolute inset-y-0 left-0 w-[1px] bg-white/40"></div>
                  
                  {/* Title Fallback Overlay (in case thumbnail fails) */}
                  {!resource.thumbnail_url && (
                     <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                        <h3 className="text-white text-[10px] font-bold leading-tight line-clamp-3">{resource.title}</h3>
                     </div>
                  )}
                  {/* Soft Copy Banner */}
                  <div className="absolute top-1.5 right-0 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-l-md shadow-md tracking-wide uppercase">
                    📄 Soft Copy
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-start gap-2 px-1">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1 line-clamp-2 break-words break-all">{resource.title}</h3>
                  {resource.description && (
                     <p className="text-[11px] text-gray-500 line-clamp-1">{resource.description}</p>
                  )}
                </div>
                {UserManager.isAdmin() && (
                  <Link 
                    to={`/edit-resource/${resource.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0 -mt-1 -mr-1"
                  >
                    <Edit2 size={14} />
                  </Link>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2 border-t border-gray-50 pt-2 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${resource.price === 0 ? 'text-green-600' : 'text-primary'}`}>
                      {resource.price === 0 ? 'FREE' : `₹${resource.price}`}
                    </span>
                    {resource.original_price && resource.original_price > resource.price && (
                      <span className="text-[10px] text-gray-400 line-through">₹{resource.original_price}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(resource);
                  }}
                  className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-bold text-xs transition-colors ${
                    resource.price === 0 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-primary text-white hover:bg-primary-light'
                  }`}
                >
                  {resource.price === 0 ? (
                    <>
                      <Download size={14} />
                      Get
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} />
                      Buy
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
