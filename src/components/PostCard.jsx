import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, MoreVertical, ExternalLink, Edit2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import WebViewModal from './WebViewModal';

export default function PostCard({ post, onCommentClick }) {
  const navigate = useNavigate();
  // Extract comment count safely
  let initialCommentCount = 0;
  if (post.prepbuddy_comments && Array.isArray(post.prepbuddy_comments) && post.prepbuddy_comments.length > 0) {
    initialCommentCount = post.prepbuddy_comments[0]?.count || 0;
  }

  const deviceId = UserManager.getUserId();
  
  // Check if current user liked it
  const initialIsLiked = post.prepbuddy_post_likes 
    ? post.prepbuddy_post_likes.some(like => like.device_id === deviceId)
    : false;
    
  const initialLikeCount = post.prepbuddy_post_likes ? post.prepbuddy_post_likes.length : 0;

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  const isMains = post.tags && post.tags.some(tag => ['GS1', 'GS2', 'GS3', 'GS4', 'ESSAY'].includes(tag.toUpperCase()));

  const handleLike = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isLiked) {
        // Unlike
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
        await supabase
          .from('prepbuddy_post_likes')
          .delete()
          .match({ post_id: post.id, device_id: deviceId });
      } else {
        // Like
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        await supabase
          .from('prepbuddy_post_likes')
          .insert([{ post_id: post.id, device_id: deviceId }]);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: isMains ? 'UPSC Mains Question' : (post.headline || 'PrepBuddy Question'),
      text: isMains 
        ? "Hey let's have a look at this UPSC Mains question!" 
        : "Hey let's have a look at this post on PrepBuddy!",
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const attemptStr = localStorage.getItem(`attempt_${UserManager.getUserId()}_${post.id}`);
  let hasAttempted = false;
  let score = 0;
  let totalMcqs = 0;
  
  if (attemptStr && post.mcqs && post.mcqs.length > 0) {
    const actualMcqs = post.mcqs.filter(m => m.type !== 'article_link');
    if (actualMcqs.length > 0) {
      try {
        const answers = JSON.parse(attemptStr);
        if (Object.keys(answers).length === actualMcqs.length) {
          hasAttempted = true;
          totalMcqs = actualMcqs.length;
          actualMcqs.forEach((mcq, idx) => {
            if (answers[idx] === mcq.answer) {
              score++;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing attempt:", e);
      }
    }
  }

  const Wrapper = isMains ? 'div' : Link;
  const wrapperProps = isMains ? { className: "block" } : { to: `/post/${post.id}`, state: { fromApp: true }, className: "block" };

  return (
    <div className="bg-white p-4 mb-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 relative overflow-hidden">
      {/* Clickable Area */}
      <Wrapper {...wrapperProps}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-[#0B2457] font-bold">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 leading-tight">
                  Vishal Kumar
                </h3>
                {hasAttempted && (
                  <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide flex items-center gap-1">
                    ✓ Attempted <span className="text-green-600/70 ml-0.5">({score}/{totalMcqs})</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">{date}</span>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => { e.preventDefault(); setIsMenuOpen(!isMenuOpen); }} 
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }}
                />
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                  {UserManager.isAdmin() && isMains && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMenuOpen(false);
                        navigate(`/edit-mains/${post.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors text-left"
                    >
                      <Edit2 size={16} />
                      <span>Edit Question</span>
                    </button>
                  )}
                  {(!UserManager.isAdmin() || !isMains) && (
                    <div className="px-4 py-2.5 text-sm text-gray-400 text-center">
                      No actions
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Image Attachment */}
        {post.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsImageFullScreen(true);
              }}
              className="w-full text-left block"
            >
              <img 
                src={post.image_url} 
                alt="Post attachment" 
                className="w-full h-auto object-cover max-h-64 cursor-zoom-in"
              />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          {post.headline && (
            <h2 className="text-lg font-bold text-[#0B2457] mb-2">{post.headline}</h2>
          )}
          {post.description && (
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{post.description}</p>
          )}
        </div>
      </Wrapper>

      {/* Article Link Banner */}
      {post.mcqs && post.mcqs.length > 0 && post.mcqs[0].type === 'article_link' && (
        <>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowWebView(true);
            }}
            className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer text-left"
          >
            <span className="font-semibold text-sm">Read about this</span>
            <ExternalLink size={16} className="text-indigo-500" />
          </button>
          
          {showWebView && (
            <WebViewModal 
              url={post.mcqs[0].url} 
              onClose={() => setShowWebView(false)} 
            />
          )}
        </>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, idx) => (
            <span 
              key={idx}
              className="px-2 py-1 bg-[#FFF5D1] text-[#0B2457] text-xs font-semibold rounded-md border border-[#FFE173]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-6 mt-2 pt-3 border-t border-gray-100">
        <button 
          onClick={handleLike}
          disabled={isLoading}
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <ThumbsUp size={20} className={isLiked ? 'fill-primary text-primary' : ''} />
          <span className="text-sm font-medium">{likeCount}</span>
        </button>
        <button 
          onClick={onCommentClick}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0B2457] transition-colors"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{initialCommentCount}</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0B2457] transition-colors ml-auto"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Full Screen Image Modal */}
      {isImageFullScreen && post.image_url && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsImageFullScreen(false);
          }}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsImageFullScreen(false);
            }}
          >
            <X size={24} />
          </button>
          <div className="w-full h-full p-4 flex items-center justify-center">
            <img 
              src={post.image_url} 
              alt="Full size attachment" 
              className="max-w-full max-h-full object-contain cursor-zoom-out"
              onClick={(e) => e.stopPropagation()} // Let clicks on the image itself optionally zoom or just not close
            />
          </div>
        </div>
      )}
    </div>
  );
}
