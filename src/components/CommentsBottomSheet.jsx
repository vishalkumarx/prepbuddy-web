import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { formatTimeAgo } from '../utils/dateFormatter';

export default function CommentsBottomSheet({ post, onClose }) {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  
  // Swipe down to close logic
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchCurrentY, setTouchCurrentY] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!touchStartY) return;
    setTouchCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartY && touchCurrentY && touchCurrentY - touchStartY > 100) {
      onClose();
    }
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  useEffect(() => {
    if (post) fetchComments();
  }, [post]);

  const fetchComments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_comments')
        .select('*, prepbuddy_comment_likes(device_id)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachmentFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setAttachmentPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && attachmentFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let attachmentUrl = null;

      if (attachmentFiles.length > 0) {
        const uploadPromises = attachmentFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('answers')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('answers')
            .getPublicUrl(fileName);

          return publicUrlData.publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        attachmentUrl = urls.join(',');
      }

      const { data, error } = await supabase
        .from('prepbuddy_comments')
        .insert([{
          post_id: post.id,
          device_id: UserManager.getUserId(),
          content: newComment.trim(),
          username: UserManager.getUsername(),
          attachment_url: attachmentUrl,
          parent_id: replyingTo ? replyingTo.id : null
        }])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setComments([...comments, data[0]]);
        setNewComment('');
        setAttachmentFiles([]);
        setAttachmentPreviews([]);
        setReplyingTo(null);
      } else {
        fetchComments(true);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId, hasLiked) => {
    try {
      if (hasLiked) {
        await supabase
          .from('prepbuddy_comment_likes')
          .delete()
          .match({ comment_id: commentId, device_id: UserManager.getUserId() });
      } else {
        await supabase
          .from('prepbuddy_comment_likes')
          .insert([{ comment_id: commentId, device_id: UserManager.getUserId() }]);
      }
      fetchComments(true);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDeleteClick = (commentId) => {
    setDeleteCommentId(commentId);
  };

  const confirmDelete = async () => {
    if (!deleteCommentId) return;
    try {
      await supabase
        .from('prepbuddy_comments')
        .delete()
        .eq('id', deleteCommentId);
      fetchComments(true);
    } catch (error) {
      console.error("Error deleting comment:", error);
    } finally {
      setDeleteCommentId(null);
    }
  };

  const handleReply = (comment) => {
    const username = comment.username || 'Anonymous';
    const parentId = comment.parent_id ? comment.parent_id : comment.id;
    setReplyingTo({ id: parentId, username });
    setNewComment(`@${username} `);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  if (!post) return null;

  const topLevelComments = comments.filter(c => !c.parent_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const renderComment = (comment, isReply = false) => {
    const isOwnComment = comment.device_id === UserManager.getUserId() || comment.username === UserManager.getUsername();
    const likes = comment.prepbuddy_comment_likes || [];
    const likesCount = likes.length;
    const hasLiked = likes.some(like => like.device_id === UserManager.getUserId());

    return (
      <div key={comment.id} className="flex gap-3">
        <div className={`rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center font-bold text-primary mt-1 ${isReply ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}`}>
          {comment.username ? comment.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-block bg-gray-50 p-3 px-4 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900">
              {comment.username || 'Anonymous'}
            </h4>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
            
            {/* Render Attachments */}
            {comment.attachment_url && (
              <div className="mt-2 flex flex-wrap gap-2">
                {comment.attachment_url.split(',').map((url, idx) => {
                  if (!url.trim()) return null;
                  if (url.endsWith('.pdf')) {
                    return (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors w-fit text-sm font-medium">
                        <FileText size={16} />
                        View PDF
                      </a>
                    );
                  }
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <img 
                        src={url} 
                        alt="attachment" 
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" 
                      />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-1.5 px-2">
            <button 
              onClick={() => handleLikeComment(comment.id, hasLiked)}
              className={`text-xs font-medium transition-colors ${hasLiked ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {likesCount > 0 ? `${likesCount} Like${likesCount > 1 ? 's' : ''}` : 'Like'}
            </button>
            <button 
              onClick={() => handleReply(comment)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Reply
            </button>
            {(isOwnComment || UserManager.isAdmin()) && (
              <button 
                onClick={() => handleDeleteClick(comment.id)}
                className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                Delete
              </button>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dimmed Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Container */}
      <div 
        className="bg-white w-full max-w-md mx-auto rounded-t-3xl shadow-2xl relative flex flex-col h-[75vh] animate-[slideUp_0.3s_ease-out]"
        style={{
          transform: touchCurrentY && touchStartY && touchCurrentY > touchStartY 
            ? `translateY(${touchCurrentY - touchStartY}px)` 
            : 'translateY(0)',
          transition: touchStartY ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        
        {/* Swipable Header Area */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-primary text-center w-full">Comments</h2>
            <button onClick={onClose} className="absolute right-4 text-gray-500 hover:text-gray-800 bg-gray-100 p-1 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-5">
              {topLevelComments.map((comment) => {
                const replies = repliesByParent[comment.id] || [];
                return (
                  <div key={comment.id} className="flex flex-col gap-3">
                    {renderComment(comment, false)}
                    
                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-10 border-l-2 border-gray-100 pl-4 space-y-3 mt-1">
                        {replies.map(reply => renderComment(reply, true))}
                      </div>
                    )}
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-10">No comments yet. Be the first!</p>
              )}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="w-full bg-white border-t border-gray-200 p-3 pb-safe flex flex-col shrink-0">
          
          {replyingTo && (
            <div className="flex items-center justify-between bg-indigo-50 px-3 py-1.5 rounded-t-lg mb-2 text-xs font-medium text-indigo-700">
              <span>Replying to @{replyingTo.username}</span>
              <button 
                onClick={() => { setReplyingTo(null); setNewComment(''); }} 
                className="hover:text-indigo-900"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Attachment Previews */}
          {attachmentPreviews.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {attachmentPreviews.map((preview, index) => (
                <div key={index} className="relative w-16 h-16 flex-shrink-0">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button 
                    onClick={() => {
                      setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
                      setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input 
              type="file" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,application/pdf"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-primary transition-colors mb-0.5"
            >
              <Paperclip size={20} />
            </button>
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className={`flex-1 bg-app-bg border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none min-h-[40px] max-h-[100px] ${replyingTo ? 'rounded-tl-none border-t-0' : ''}`}
              rows="1"
            />
            <button
              onClick={handlePostComment}
              disabled={(!newComment.trim() && attachmentFiles.length === 0) || isSubmitting}
              className="bg-primary hover:bg-primary-light text-white p-2.5 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mb-0.5"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
      {/* Custom Delete Confirmation Modal */}
      {deleteCommentId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-[slideUp_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Comment?</h3>
            <p className="text-gray-600 text-sm mb-6">Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteCommentId(null)}
                className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
