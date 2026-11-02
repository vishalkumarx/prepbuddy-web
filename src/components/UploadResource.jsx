import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { ArrowLeft, Upload, FileText, IndianRupee, Image as ImageIcon, Trash2, Sparkles, Layers } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function UploadResource({ isEdit = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [file, setFile] = useState(null);
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState(null);
  const [customImageFile, setCustomImageFile] = useState(null);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingResource, setExistingResource] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  useEffect(() => {
    // Load courses for optional linking
    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from('prepbuddy_test_series')
          .select('id, title, linked_store_items')
          .order('created_at', { ascending: false });
        const validCourses = (data || []).filter(c => !c.title?.startsWith('INTERNAL_'));
        setAvailableCourses(validCourses);

        if (isEdit && id) {
          const linked = validCourses
            .filter(c => (c.linked_store_items || []).includes(id))
            .map(c => c.id);
          setSelectedCourseIds(linked);
        }
      } catch (e) {
        console.error("Error loading courses for resource:", e);
      }
    };
    fetchCourses();
  }, [isEdit, id]);

  useEffect(() => {
    if (isEdit && id) {
      const fetchResource = async () => {
        const { data, error } = await supabase
          .from('prepbuddy_store')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data && !error) {
          setTitle(data.title);
          setDescription(data.description || '');
          setPrice(data.price.toString());
          if (data.original_price) {
            setOriginalPrice(data.original_price.toString());
          }
          if (data.thumbnail_url) {
            setThumbnailDataUrl(data.thumbnail_url);
          }
          setExistingResource(data);
        }
      };
      fetchResource();
    }
  }, [isEdit, id]);

  // Security check: Only admins can access this page
  if (!UserManager.isAdmin()) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Access Denied. Admins only.
      </div>
    );
  }

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
        }, 'image/jpeg', 0.8);
      });
    } catch (err) {
      console.error("Error generating PDF thumbnail:", err);
      return null;
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      
      // Automatically set title to file name (without extension) if title is empty
      if (!title) {
        const fileNameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(fileNameWithoutExt);
      }
      
      // Generate thumbnail
      const blob = await generateThumbnail(selected);
      if (blob && !isCustomImage) {
        setThumbnailBlob(blob);
        setThumbnailDataUrl(URL.createObjectURL(blob));
      }
    } else {
      alert('Please select a valid PDF file.');
      e.target.value = null;
      setFile(null);
      if (!isCustomImage) {
        setThumbnailBlob(null);
        setThumbnailDataUrl(null);
      }
    }
  };

  const handleCustomImageChange = (e) => {
    const selected = e.target.files[0];
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
    
    // Fall back to PDF first page thumbnail if PDF exists
    if (file) {
      const blob = await generateThumbnail(file);
      if (blob) {
        setThumbnailBlob(blob);
        setThumbnailDataUrl(URL.createObjectURL(blob));
      } else {
        setThumbnailBlob(null);
        setThumbnailDataUrl(null);
      }
    } else if (existingResource?.thumbnail_url) {
      setThumbnailDataUrl(existingResource.thumbnail_url);
    } else {
      setThumbnailBlob(null);
      setThumbnailDataUrl(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || (!isEdit && !file)) {
      alert("Please provide a title and a PDF file.");
      return;
    }

    setLoading(true);
    try {
      let fileUrl = isEdit ? existingResource?.file_url : null;
      let thumbnailUrl = isEdit ? existingResource?.thumbnail_url : null;

      // 1. Upload PDF file if selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const baseName = Math.random().toString(36).substring(2) + '_' + Date.now();
        const fileName = `${baseName}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('store_resources')
          .upload(fileName, file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error("Failed to upload PDF file to storage.");
        }

        const { data: publicUrlData } = supabase.storage
          .from('store_resources')
          .getPublicUrl(fileName);

        fileUrl = publicUrlData.publicUrl;

        // Auto thumbnail from PDF if no custom image was explicitly chosen
        if (thumbnailBlob && !customImageFile && !thumbnailUrl) {
          const thumbName = `${baseName}_thumb.jpg`;
          const { error: thumbUploadError } = await supabase.storage
            .from('store_resources')
            .upload(thumbName, thumbnailBlob, { contentType: 'image/jpeg' });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from('store_resources')
              .getPublicUrl(thumbName);
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        }
      }

      // 2. Upload Custom Image if selected
      if (customImageFile) {
        const imgExt = customImageFile.name.split('.').pop() || 'jpg';
        const imgFileName = `cover_${Math.random().toString(36).substring(2)}_${Date.now()}.${imgExt}`;
        const { error: imgUploadError } = await supabase.storage
          .from('store_resources')
          .upload(imgFileName, customImageFile, { contentType: customImageFile.type || 'image/jpeg' });

        if (imgUploadError) {
          console.error("Custom image upload error:", imgUploadError);
          throw new Error("Failed to upload custom cover image.");
        }

        const { data: imgUrlData } = supabase.storage
          .from('store_resources')
          .getPublicUrl(imgFileName);

        thumbnailUrl = imgUrlData.publicUrl;
      } else if (!customImageFile && thumbnailBlob && !thumbnailUrl) {
        // Fallback thumbnail upload if only PDF thumbnailBlob exists
        const thumbName = `thumb_${Math.random().toString(36).substring(2)}_${Date.now()}.jpg`;
        const { error: thumbUploadError } = await supabase.storage
          .from('store_resources')
          .upload(thumbName, thumbnailBlob, { contentType: 'image/jpeg' });

        if (!thumbUploadError) {
          const { data: thumbUrlData } = supabase.storage
            .from('store_resources')
            .getPublicUrl(thumbName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        original_price: parseFloat(originalPrice) || null,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
      };

      let savedResourceId = id;
      if (isEdit) {
        const { data: updateData, error: dbError } = await supabase
          .from('prepbuddy_store')
          .update(payload)
          .eq('id', id)
          .select();

        console.log("Update result:", updateData, "Error:", dbError);

        if (dbError) {
          console.error("DB update error:", dbError);
          throw new Error(`Failed to update: ${dbError.message} (code: ${dbError.code})`);
        }
        if (!updateData || updateData.length === 0) {
          throw new Error("Update matched 0 rows. Check that the record ID exists and RLS policy allows updates.");
        }
      } else {
        payload.uploaded_by = UserManager.getUserId();
        const { data: insertData, error: dbError } = await supabase
          .from('prepbuddy_store')
          .insert([payload])
          .select();

        if (dbError) {
          console.error("DB insert error:", dbError);
          throw new Error("Failed to save resource record. Did you create the 'prepbuddy_store' table?");
        }
        if (insertData && insertData.length > 0) {
          savedResourceId = insertData[0].id;
        }
      }

      // Sync linked test series courses
      if (savedResourceId) {
        await Promise.all(
          availableCourses.map(async (course) => {
            const currentLinked = course.linked_store_items || [];
            const shouldBeLinked = selectedCourseIds.includes(course.id);
            const isCurrentlyLinked = currentLinked.includes(savedResourceId);

            if (shouldBeLinked && !isCurrentlyLinked) {
              const updated = [...currentLinked, savedResourceId];
              await supabase
                .from('prepbuddy_test_series')
                .update({ linked_store_items: updated })
                .eq('id', course.id);
            } else if (!shouldBeLinked && isCurrentlyLinked) {
              const updated = currentLinked.filter(itemId => itemId !== savedResourceId);
              await supabase
                .from('prepbuddy_test_series')
                .update({ linked_store_items: updated })
                .eq('id', course.id);
            }
          })
        );
      }

      alert(isEdit ? "Resource updated successfully!" : "Resource uploaded successfully!");
      navigate('/store');

    } catch (err) {
      console.error(err);
      alert(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="bg-white flex items-center p-4 shadow-sm z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2 text-primary">{isEdit ? 'Edit Resource' : 'Upload Resource'}</h1>
      </header>

      {/* Upload Form */}
      <div className="p-5 flex-1 pb-24">
        
        {/* Live Store Preview */}
        <div className="mb-6 flex flex-col items-center">
          <label className="block text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Store Preview</label>
          <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100 w-[160px]">
            <div className="w-full h-48 bg-indigo-50 rounded-xl overflow-hidden relative flex items-center justify-center">
              <img 
                src={thumbnailDataUrl || "/book-mockup.jpg"} 
                alt="Resource Cover" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-3 left-3 text-white right-2">
                <h3 className="text-[13px] font-bold leading-tight line-clamp-3">{title || 'Your Resource Title'}</h3>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          
          {/* File Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Resource File (PDF)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${file ? 'border-primary bg-indigo-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="application/pdf"
              />
              {file ? (
                <>
                  <FileText className="text-primary mb-3" size={40} />
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="text-gray-400 mb-3" size={40} />
                  <p className="font-medium text-gray-600 text-sm">Tap to select a PDF</p>
                  <p className="text-xs text-gray-400 mt-1">Max size: 50MB</p>
                </>
              )}
            </div>
          </div>

          {/* Custom Cover Image Option */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <ImageIcon size={18} className="text-primary" />
                Custom Cover Image (Optional)
              </label>
              {customImageFile && (
                <button
                  type="button"
                  onClick={handleRemoveCustomImage}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              By default, the 1st page of your PDF is automatically extracted as the cover. You can upload your own custom high-res cover image here instead.
            </p>

            <input 
              type="file" 
              ref={imageInputRef} 
              onChange={handleCustomImageChange} 
              className="hidden" 
              accept="image/*"
            />

            {customImageFile || (isEdit && thumbnailDataUrl) ? (
              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
                <div className="w-14 h-18 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                  <img 
                    src={thumbnailDataUrl} 
                    alt="Custom cover preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {customImageFile ? customImageFile.name : 'Current Cover Image'}
                  </p>
                  <p className="text-xs text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Sparkles size={12} />
                    Custom cover active
                  </p>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="mt-1 text-xs text-primary font-bold hover:underline"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 border border-dashed border-gray-300 hover:border-primary rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Upload size={16} className="text-gray-400" />
                <span>Upload Custom Image (PNG, JPG, WebP)</span>
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Resource Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Current Affairs March 2024"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What does this resource cover?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors resize-none h-24"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Price (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee size={16} className="text-gray-400" />
                </div>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  min="0"
                  step="1"
                  placeholder="0 for Free"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors font-bold text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Leave 0 to make it free.</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Original Price (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee size={16} className="text-gray-400" />
                </div>
                <input 
                  type="number" 
                  value={originalPrice} 
                  onChange={(e) => setOriginalPrice(e.target.value)} 
                  min="0"
                  step="1"
                  placeholder="Optional"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Shows a discount banner.</p>
            </div>
          </div>

          {/* Link to Test Series Courses */}
          {availableCourses.length > 0 && (
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                <span>Link to Test Series (Optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Students who view or enroll in these test series will also see this resource in their course contents.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableCourses.map(course => {
                  const isChecked = selectedCourseIds.includes(course.id);
                  return (
                    <label
                      key={course.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCourseIds(prev => 
                            prev.includes(course.id)
                              ? prev.filter(cId => cId !== course.id)
                              : [...prev, course.id]
                          );
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-gray-900 leading-tight select-none">
                        {course.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading || !title || (!isEdit && !file)}
            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] mt-6 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isEdit ? 'Updating...' : 'Uploading...'}</span>
              </div>
            ) : (
              isEdit ? 'Update Resource' : 'Publish Resource'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
