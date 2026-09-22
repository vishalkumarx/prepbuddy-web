import React, { useState, useEffect } from 'react';
import { ShoppingBag, FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';

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
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">{resource.description}</p>
                  )}
                </div>
                <div className="bg-red-50 p-3 rounded-xl flex-shrink-0">
                  <FileText className="text-red-500" size={24} />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Price</span>
                  <span className={`text-lg font-bold ${resource.price === 0 ? 'text-green-600' : 'text-primary'}`}>
                    {resource.price === 0 ? 'FREE' : `₹${resource.price}`}
                  </span>
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
