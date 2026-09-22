import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { ImagePlus, X, Upload } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function UploadMains({ isEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GS1');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [articleLink, setArticleLink] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const CATEGORIES = ['GS1', 'GS2', 'GS3', 'GS4', 'ESSAY'];

  useEffect(() => {
    if (isEdit && id) {
      fetchPostDetails();
    }
  }, [isEdit, id]);

  const fetchPostDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setHeadline(data.headline || '');
      setDescription(data.description || '');
      
      if (data.image_url) {
        setImagePreview(data.image_url);
      }
      
      if (data.mcqs && data.mcqs.length > 0 && data.mcqs[0].type === 'article_link') {
        setArticleLink(data.mcqs[0].url || '');
      }

      // Extract category from tags
      const currentTags = data.tags || [];
      const foundCat = currentTags.find(t => CATEGORIES.includes(t));
      if (foundCat) {
        setCategory(foundCat);
        setTags(currentTags.filter(t => t !== foundCat));
      } else {
        setTags(currentTags);
      }
    } catch (err) {
      console.error("Error fetching post details:", err);
      setError("Failed to load question details for editing.");
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description (Question) is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('answers')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('answers')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const finalTags = new Set(tags);
      finalTags.add(category);
      
      const payloadMcqs = articleLink.trim() ? [{ type: 'article_link', url: articleLink.trim() }] : [];
      
      const payload = {
        headline: headline.trim(),
        description: description.trim(),
        tags: Array.from(finalTags),
        mcqs: payloadMcqs
      };
      
      // Only include image_url if we uploaded a new one, or if we didn't change it (already handled by not touching it unless uploaded)
      // Wait, if it's an edit, we only update image_url if a new image was uploaded.
      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      let dbError = null;
      if (isEdit && id) {
        const { error: updateError } = await supabase
          .from('feed_posts')
          .update(payload)
          .eq('id', id);
        dbError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('feed_posts')
          .insert([payload]);
        dbError = insertError;
      }

      if (dbError) throw dbError;

      navigate('/');
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || 'Failed to upload Mains question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-app-bg min-h-screen pb-20">
      <div className="bg-primary text-white p-4 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate(-1)} className="mr-4 hover:bg-white/10 p-1 rounded-full transition-colors">
          <X size={24} />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? 'Edit Mains Question' : 'Upload Mains Question'}</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline (Optional)</label>
            <input 
              type="text" 
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow"
              placeholder="Enter a short headline..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Question *</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow min-h-[120px] resize-y"
              placeholder="Type your detailed mains question here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article Link (Optional)</label>
            <input 
              type="url" 
              value={articleLink}
              onChange={e => setArticleLink(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow"
              placeholder="https://example.com/article"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Tags</label>
              <input 
                type="text" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                onBlur={handleAddTag}
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Type & press Enter..."
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attach Image (Optional)</label>
            
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border border-gray-200 shadow-sm" />
                <button 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus size={32} className="mb-2" />
                <span className="text-sm font-medium">Click to select an image</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-secondary hover:bg-yellow-500 text-primary font-bold py-3.5 rounded-xl mt-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={20} />
                <span>{isEdit ? 'Update Question' : 'Submit Question'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
