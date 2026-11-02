import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, FileText, Download, ExternalLink, Edit2, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { SearchContext } from '../App';

const PAGE_SIZE = 8;

export default function Store() {
  const navigate = useNavigate();
  const { searchQuery } = useContext(SearchContext) || { searchQuery: '' };
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef(null);

  const fetchBatch = async (pageNumber, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    }

    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('prepbuddy_store')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newItems = data || [];
      if (isInitial) {
        setResources(newItems);
      } else {
        setResources(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = newItems.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
      }

      const reachedEnd = newItems.length < PAGE_SIZE;
      setHasMore(!reachedEnd);
      hasMoreRef.current = !reachedEnd;
      pageRef.current = pageNumber;
    } catch (err) {
      console.error("Error fetching store resources:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  };

  useEffect(() => {
    pageRef.current = 0;
    hasMoreRef.current = true;
    fetchBatch(0, true);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    fetchBatch(pageRef.current + 1, false);
  }, []);

  // IntersectionObserver on sentinelRef
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadMore();
        }
      },
      { root: null, rootMargin: '300px', threshold: 0 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [loadMore, loading]);

  // Fallback scroll listener on window and nearest scrollable ancestor (<main>)
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target === document ? document.documentElement : e.target;
      if (!target) return;
      
      const scrollHeight = target.scrollHeight;
      const scrollTop = target.scrollTop || window.scrollY || 0;
      const clientHeight = target.clientHeight || window.innerHeight;

      if (scrollHeight - scrollTop - clientHeight < 400) {
        if (hasMoreRef.current && !loadingMoreRef.current) {
          loadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loadMore]);

  const handleAction = (resource) => {
    if (resource.price === 0) {
      window.open(resource.file_url, '_blank');
    } else {
      navigate(`/payment/resource/${resource.id}?price=${resource.price}`);
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
      {(() => {
        const filteredResources = resources.filter(r => 
          !searchQuery || 
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="px-3 md:px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-20 max-w-6xl mx-auto w-full">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-indigo-50 p-4 rounded-full mb-4">
                  <ShoppingBag size={32} className="text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                  {searchQuery ? 'No resources matching your search' : 'No resources yet'}
                </h3>
                <p className="text-gray-500 text-sm mt-2">
                  {searchQuery ? 'Try searching for different keywords.' : 'Check back later for new study materials!'}
                </p>
              </div>
            ) : (
              filteredResources.map((resource) => (
            <div 
              key={resource.id} 
              onClick={() => navigate(`/store/${resource.id}`)}
              className="bg-white rounded-xl p-2.5 md:p-3 shadow-xs hover:shadow-md border border-gray-100 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
            >
              {/* Cover Preview Area - prominent book size */}
              <div className="w-full bg-slate-50/80 rounded-lg overflow-hidden mb-2 py-3 md:py-4 flex items-center justify-center relative aspect-[3/4] border border-gray-100/60">
                {/* Discount Banner */}
                {resource.original_price && resource.original_price > resource.price && (
                  <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs z-10">
                    {Math.round(((resource.original_price - resource.price) / resource.original_price) * 100)}% OFF
                  </div>
                )}
                {/* Cover Display: Flat for custom uploaded image, 3D Mockup for auto-extracted PDF */}
                {resource.thumbnail_url && resource.thumbnail_url.includes('cover_') ? (
                  <div className="relative w-[85%] h-[92%] rounded-lg overflow-hidden shadow-sm border border-gray-200/80 bg-white group-hover:shadow-md transition-shadow">
                    <img 
                      src={resource.thumbnail_url} 
                      alt={resource.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Soft Copy Banner */}
                    <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs tracking-wider uppercase">
                      📄 PDF
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative w-[75%] h-[85%] max-w-[130px] shadow-lg rounded-sm transition-transform duration-300 group-hover:scale-105"
                    style={{
                      perspective: '1000px',
                      transformStyle: 'preserve-3d',
                      transform: 'rotateY(-12deg) rotateX(4deg)'
                    }}
                  >
                    <img 
                      src={resource.thumbnail_url || "/book-mockup.jpg"} 
                      alt="Resource Cover" 
                      className="w-full h-full object-cover rounded-r border border-gray-200/90 absolute inset-0 bg-white shadow-xs"
                      loading="lazy"
                    />
                    {/* Book Spine Overlay */}
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/35 via-black/10 to-transparent rounded-l-sm"></div>
                    <div className="absolute inset-y-0 left-0 w-[1px] bg-white/50"></div>
                    
                    {/* Title Fallback Overlay (in case thumbnail fails) */}
                    {!resource.thumbnail_url && (
                       <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                          <h3 className="text-white text-[9px] font-bold leading-tight line-clamp-3">{resource.title}</h3>
                       </div>
                    )}
                    {/* Soft Copy Banner */}
                    <div className="absolute bottom-1 right-0 bg-blue-600 text-white text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded-l shadow-xs tracking-wider uppercase">
                      📄 PDF
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex justify-between items-start gap-1 px-0.5 mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs md:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                     <p className="text-[10px] md:text-[11px] text-gray-400 line-clamp-1 mt-0.5">{resource.description}</p>
                  )}
                </div>
                {UserManager.isAdmin() && (
                  <Link 
                    to={`/edit-resource/${resource.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                    title="Edit Note"
                  >
                    <Edit2 size={13} />
                  </Link>
                )}
              </div>

              {/* Price & Action Button */}
              <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-100 pt-2 px-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xs md:text-sm font-bold ${resource.price === 0 ? 'text-green-600' : 'text-primary'}`}>
                      {resource.price === 0 ? 'FREE' : `₹${resource.price}`}
                    </span>
                    {resource.original_price && resource.original_price > resource.price && (
                      <span className="text-[9px] md:text-[10px] text-gray-400 line-through">₹{resource.original_price}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(resource);
                  }}
                  className={`flex items-center justify-center gap-1 w-full py-1.5 rounded-lg font-bold text-[11px] md:text-xs transition-colors shadow-2xs ${
                    resource.price === 0 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-primary text-white hover:bg-primary-light active:scale-95'
                  }`}
                >
                  {resource.price === 0 ? (
                    <>
                      <Download size={13} />
                      Get
                    </>
                  ) : (
                    <>
                      <ExternalLink size={13} />
                      Buy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  })()}

      {/* Infinite Scroll Sentinel & Loader */}
      {!loading && (
        <div ref={sentinelRef} className="w-full flex justify-center items-center py-6">
          {loadingMore && (
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <Loader2 className="animate-spin text-primary" size={20} />
              <span>Loading more notes...</span>
            </div>
          )}
          {!hasMore && resources.length > 0 && (
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              You've reached the end of the store collection
            </p>
          )}
        </div>
      )}
    </div>
  );
}
