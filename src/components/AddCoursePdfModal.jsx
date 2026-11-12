import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { 
  X, Upload, FileText, IndianRupee, Image as ImageIcon, 
  Trash2, Sparkles, Check, Search, ShoppingBag, Eye, ExternalLink, Plus, Layers
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker with fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
}

export default function AddCoursePdfModal({ isOpen, onClose, course, onPdfAdded }) {
  if (!isOpen || !course) return null;

  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'library'
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Upload Tab Form State
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState(null);
  const [customImageFile, setCustomImageFile] = useState(null);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Library Tab State
  const [storeResources, setStoreResources] = useState([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Current linked store items
  const [linkedIds, setLinkedIds] = useState(course.linked_store_items || []);

  useEffect(() => {
    setLinkedIds(course.linked_store_items || []);
  }, [course]);

  useEffect(() => {
    if (activeTab === 'library') {
      fetchStoreResources();
    }
  }, [activeTab]);

  const fetchStoreResources = async () => {
    setLoadingStore(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_store')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStoreResources(data || []);
    } catch (err) {
      console.error('Error fetching store resources:', err);
    } finally {
      setLoadingStore(false);
    }
  };

  const generateThumbnail = async (pdfFile) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.85);
      });
    } catch (err) {
      console.error('Error generating PDF thumbnail:', err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);

      // Set default title to file name without extension if title empty
      if (!title) {
        const fileNameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(fileNameWithoutExt);
      }

      // Generate preview
      const blob = await generateThumbnail(selected);
      if (blob && !isCustomImage) {
        setThumbnailBlob(blob);
        setThumbnailDataUrl(URL.createObjectURL(blob));
      }
    } else if (selected) {
      alert('Please select a valid PDF file.');
      e.target.value = null;
    }
  };

  const handleCustomImageChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      setCustomImageFile(selected);
      setIsCustomImage(true);
      setThumbnailBlob(selected);
      setThumbnailDataUrl(URL.createObjectURL(selected));
    } else if (selected) {
      alert('Please select an image file (PNG, JPG, WebP).');
    }
  };

  const handleRemoveCustomImage = async () => {
    setCustomImageFile(null);
    setIsCustomImage(false);
    if (imageInputRef.current) imageInputRef.current.value = null;

    if (file) {
      const blob = await generateThumbnail(file);
      if (blob) {
        setThumbnailBlob(blob);
        setThumbnailDataUrl(URL.createObjectURL(blob));
      } else {
        setThumbnailBlob(null);
        setThumbnailDataUrl(null);
      }
    } else {
      setThumbnailBlob(null);
      setThumbnailDataUrl(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a PDF file to upload.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title for this PDF.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const baseName = Math.random().toString(36).substring(2) + '_' + Date.now();
      const fileName = `${baseName}.${fileExt}`;

      // 1. Upload PDF to store_resources bucket
      const { error: uploadError } = await supabase.storage
        .from('store_resources')
        .upload(fileName, file, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload PDF file to storage.');
      }

      const { data: publicUrlData } = supabase.storage
        .from('store_resources')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;

      // 2. Upload thumbnail if available
      let thumbnailUrl = null;
      if (customImageFile) {
        const imgExt = customImageFile.name.split('.').pop() || 'jpg';
        const imgFileName = `cover_${baseName}.${imgExt}`;
        const { error: imgErr } = await supabase.storage
          .from('store_resources')
          .upload(imgFileName, customImageFile, { contentType: customImageFile.type || 'image/jpeg' });
        if (!imgErr) {
          thumbnailUrl = supabase.storage.from('store_resources').getPublicUrl(imgFileName).data.publicUrl;
        }
      } else if (thumbnailBlob) {
        const thumbName = `thumb_${baseName}.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from('store_resources')
          .upload(thumbName, thumbnailBlob, { contentType: 'image/jpeg' });
        if (!thumbErr) {
          thumbnailUrl = supabase.storage.from('store_resources').getPublicUrl(thumbName).data.publicUrl;
        }
      }

      // 3. Insert into prepbuddy_store
      const finalPrice = isFree ? 0 : (parseFloat(price) || 0);
      const { data: storeItem, error: dbError } = await supabase
        .from('prepbuddy_store')
        .insert([{
          title: title.trim(),
          description: description.trim(),
          price: finalPrice,
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          uploaded_by: UserManager.getUserId(),
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Attach to this course in prepbuddy_test_series
      const currentList = Array.isArray(course.linked_store_items) ? course.linked_store_items : [];
      const updatedLinked = [...currentList, storeItem.id];

      const { data: updatedCourse, error: courseUpdateErr } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_store_items: updatedLinked })
        .eq('id', course.id)
        .select()
        .single();

      if (courseUpdateErr) throw courseUpdateErr;

      setLinkedIds(updatedLinked);
      onPdfAdded?.(storeItem, updatedCourse);
      alert(`✅ "${title}" has been successfully added to ${course.title}!`);
      onClose();
    } catch (err) {
      console.error('Error adding PDF to course:', err);
      alert('Error uploading PDF: ' + (err.message || 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleToggleLink = async (resource) => {
    setActionLoadingId(resource.id);
    try {
      const currentList = Array.isArray(linkedIds) ? linkedIds : [];
      const isAlreadyLinked = currentList.includes(resource.id);
      const updatedLinked = isAlreadyLinked
        ? currentList.filter(id => id !== resource.id)
        : [...currentList, resource.id];

      const { data: updatedCourse, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_store_items: updatedLinked })
        .eq('id', course.id)
        .select()
        .single();

      if (error) throw error;

      setLinkedIds(updatedLinked);
      onPdfAdded?.(resource, updatedCourse);
    } catch (err) {
      alert('Error linking resource: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredStoreResources = storeResources.filter(res => 
    res.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-emerald-50/50 via-white to-indigo-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shrink-0">
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">
                Add PDF Content
              </h2>
              <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                Course: <span className="font-bold text-gray-700">{course.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-gray-100 flex gap-4 bg-gray-50/60 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Upload size={16} />
            <span>Upload New PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`pb-2.5 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'library'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Select from Store Library</span>
            {linkedIds.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {linkedIds.length} Linked
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {activeTab === 'upload' ? (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* PDF File Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select PDF File *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf"
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <div className="w-12 h-14 bg-white rounded-xl border border-emerald-200 shadow-xs flex flex-col items-center justify-center text-emerald-700 shrink-0">
                      <FileText size={24} />
                      <span className="text-[8px] font-black uppercase mt-0.5">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                        <Sparkles size={12} /> Auto-generating cover preview
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setThumbnailBlob(null);
                        setThumbnailDataUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = null;
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl transition-colors shrink-0"
                      title="Remove selected file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/50 hover:bg-emerald-50/20 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-gray-200 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform text-gray-400 group-hover:text-emerald-600">
                      <Upload size={22} />
                    </div>
                    <p className="text-sm font-bold text-gray-800">Click or Drag & Drop PDF here</p>
                    <p className="text-xs text-gray-400 mt-0.5">Supports study notes, mocks, syllabus, or booklets (up to 50MB)</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  PDF Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete Punjab GK Quick Notes & Formula Sheet"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what this PDF covers for students taking this course..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all resize-none text-gray-800"
                />
              </div>

              {/* Pricing & Access */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Access & Pricing
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {isFree ? 'Free for Course Students' : `Paid (₹${price || 0})`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFree(true);
                      setPrice('0');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isFree
                        ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-white/60 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${isFree ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
                      {isFree && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-snug">Included Free</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Enrolled students get instant unlocked access</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFree(false);
                      if (price === '0') setPrice('49');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      !isFree
                        ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-white/60 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${!isFree ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
                      {!isFree && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-snug">Optional / Paid</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Can also be purchased separately in Store</p>
                    </div>
                  </button>
                </div>

                {!isFree && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Price (₹)</label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="e.g. 49"
                          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Original Price (₹)</label>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          value={originalPrice}
                          onChange={(e) => setOriginalPrice(e.target.value)}
                          placeholder="e.g. 99"
                          className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Cover Thumbnail */}
              <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-emerald-600" />
                    Cover Thumbnail
                  </label>
                  {customImageFile && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomImage}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleCustomImageChange}
                  accept="image/*"
                  className="hidden"
                />

                {thumbnailDataUrl ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <img src={thumbnailDataUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {customImageFile ? customImageFile.name : 'Extracted from PDF Page 1'}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        {customImageFile ? 'Custom cover image active' : 'Auto cover generated successfully'}
                      </p>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="mt-1 text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Upload Custom Cover Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload size={14} className="text-gray-400" />
                    <span>Upload Custom Cover Image (Optional)</span>
                  </button>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file || !title.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading & Attaching PDF...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>Add PDF to Course</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store PDFs..."
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {loadingStore ? (
                <div className="flex justify-center p-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : filteredStoreResources.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">No matching PDFs found</p>
                  <p className="text-xs text-gray-500 mt-1">Switch to the "Upload New PDF" tab to add one!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredStoreResources.map((res) => {
                    const isLinked = linkedIds.includes(res.id);
                    const isLoading = actionLoadingId === res.id;
                    return (
                      <div
                        key={res.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isLinked
                            ? 'bg-emerald-50/70 border-emerald-200 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative">
                            {res.thumbnail_url ? (
                              <img src={res.thumbnail_url} alt={res.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-1 text-center bg-gray-50">
                                <FileText size={18} className="mb-0.5 text-gray-400" />
                                <span className="text-[7px] font-bold">PDF</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-1">{res.title}</h4>
                            {res.description && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{res.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-emerald-700">
                                {Number(res.price) === 0 ? 'FREE' : `₹${res.price}`}
                              </span>
                              {isLinked && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <Check size={11} strokeWidth={3} /> Attached to Course
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {res.file_url && (
                            <a
                              href={res.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Preview PDF"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggleLink(res)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                              isLinked
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {isLoading ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isLinked ? (
                              <>
                                <Trash2 size={13} /> Detach
                              </>
                            ) : (
                              <>
                                <Plus size={13} /> Attach
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-900 text-white hover:bg-black font-bold rounded-xl text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

