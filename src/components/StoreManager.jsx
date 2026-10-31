import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { 
  ArrowLeft, Plus, Trash2, Edit2, ShoppingBag, 
  ExternalLink, FileText, Search, RefreshCw, Eye, Tag, AlertCircle 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function StoreManager() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDelete = async (resource) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${resource.title}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingId(resource.id);
    try {
      const { error } = await supabase
        .from('prepbuddy_store')
        .delete()
        .eq('id', resource.id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== resource.id));
      alert("Resource deleted successfully!");
    } catch (err) {
      console.error("Error deleting resource:", err);
      alert(`Failed to delete resource: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!UserManager.isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You must be logged in as an administrator to manage store items.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-opacity-90 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const filteredResources = resources.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white px-6 py-6 sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/profile')} 
              className="p-2 -ml-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white/90 hover:text-white"
              title="Back to Profile"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="text-secondary" size={24} />
                Store Management
              </h1>
              <p className="text-xs text-white/70">Manage store notes, PDF resources, and prices</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchResources}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/upload-resource"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary text-primary font-bold text-sm rounded-xl hover:bg-yellow-400 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Add Resource</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-6">
        {/* Search Bar & Quick Stats */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={18} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search store resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 w-full md:w-auto justify-between md:justify-end">
            <span className="bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-gray-700">
              Total: {resources.length} {resources.length === 1 ? 'item' : 'items'}
            </span>
            <Link 
              to="/store" 
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Eye size={14} /> View Public Store
            </Link>
          </div>
        </div>

        {/* Resources List */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-500 font-medium">Loading store resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {searchQuery ? 'No matching resources found' : 'No store items available'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? 'Try searching with different keywords.' 
                : 'Get started by uploading PDF notes or study materials to make them available in the Store.'}
            </p>
            <Link
              to="/upload-resource"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-opacity-95 shadow-sm transition-all"
            >
              <Plus size={18} />
              Upload First Resource
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.map((resource) => {
              const isFree = resource.price === 0;
              const hasDiscount = resource.original_price && resource.original_price > resource.price;
              const discountPercent = hasDiscount 
                ? Math.round(((resource.original_price - resource.price) / resource.original_price) * 100) 
                : 0;

              return (
                <div 
                  key={resource.id}
                  className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail Preview */}
                    <div className="w-20 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 relative group">
                      {resource.thumbnail_url ? (
                        <img 
                          src={resource.thumbnail_url} 
                          alt={resource.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                          <FileText size={24} className="mb-1" />
                          <span className="text-[9px] font-semibold">PDF</span>
                        </div>
                      )}
                      {hasDiscount && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow-xs">
                          {discountPercent}%
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
                          {resource.title}
                        </h3>
                      </div>

                      {resource.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {resource.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className={`text-base font-bold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                          {isFree ? 'FREE' : `₹${resource.price}`}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{resource.original_price}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/store/${resource.id}`)}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="View Resource Detail"
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>

                      {resource.file_url && (
                        <a
                          href={resource.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Open PDF File"
                        >
                          <ExternalLink size={14} />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/edit-resource/${resource.id}`)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(resource)}
                        disabled={deletingId === resource.id}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        <span>{deletingId === resource.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
