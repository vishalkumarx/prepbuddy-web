import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import PostCard from './PostCard';
import CommentsBottomSheet from './CommentsBottomSheet';
import { Loader2, Plus } from 'lucide-react';
import { SearchContext } from '../App';

export default function Feed({ feedType }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCommentPost, setSelectedCommentPost] = useState(null);
  const navigate = useNavigate();
  const { searchQuery } = useContext(SearchContext) || { searchQuery: '' };

  useEffect(() => {
    fetchFeed();
  }, [feedType]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      
      const query = supabase
        .from('feed_posts')
        .select('*, prepbuddy_comments(count), prepbuddy_post_likes(device_id), prepbuddy_sources(*)')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFabClick = () => {
    if (feedType === 'mains') {
      navigate('/upload-mains');
    } else {
      navigate('/upload-post');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-[#0B2457]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <h3 className="font-bold mb-1">Failed to load feed</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const filteredPosts = posts.filter(post => {
    const isMains = post.tags && post.tags.some(tag => ['GS1', 'GS2', 'GS3', 'GS4', 'ESSAY'].includes(tag.toUpperCase()));
    
    if (feedType === 'mains' && !isMains) return false;
    if (feedType !== 'mains' && isMains) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const headline = (post.headline || '').toLowerCase();
    const desc = (post.description || '').toLowerCase();
    const tags = Array.isArray(post.tags) ? post.tags.join(' ').toLowerCase() : '';
    return headline.includes(q) || desc.includes(q) || tags.includes(q);
  });

  return (
    <div className="pb-24 max-w-2xl mx-auto pt-6 px-2 sm:px-4">
      {filteredPosts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>{searchQuery ? 'No posts found matching your search.' : 'No posts found. Be the first to upload!'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onCommentClick={() => setSelectedCommentPost(post)}
            />
          ))}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      {selectedCommentPost && (
        <CommentsBottomSheet 
          post={selectedCommentPost} 
          onClose={() => setSelectedCommentPost(null)} 
        />
      )}
    </div>
  );
}
