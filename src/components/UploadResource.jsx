import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { ArrowLeft, Upload, FileText, IndianRupee } from 'lucide-react';

export default function UploadResource() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Security check: Only admins can access this page
  if (!UserManager.isAdmin()) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Access Denied. Admins only.
      </div>
    );
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
    } else {
      alert('Please select a valid PDF file.');
      e.target.value = null;
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      alert("Please provide a title and a PDF file.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get Pre-signed URL from our Vercel Serverless Function
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL. Are your R2 environment variables set up in Vercel?');
      }

      const { signedUrl, publicUrl } = await response.json();

      // 2. Upload directly to Cloudflare R2
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to Cloudflare R2.');
      }

      const fileUrl = publicUrl;

      // 2. Insert record into prepbuddy_store
      const { error: dbError } = await supabase
        .from('prepbuddy_store')
        .insert([{
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          file_url: fileUrl,
          uploaded_by: UserManager.getUserId()
        }]);

      if (dbError) {
        console.error("DB insert error:", dbError);
        throw new Error("Failed to save resource record. Did you create the 'prepbuddy_store' table?");
      }

      alert("Resource uploaded successfully!");
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
        <h1 className="text-xl font-bold ml-2 text-primary">Upload Resource</h1>
      </header>

      {/* Upload Form */}
      <div className="p-5 flex-1 pb-24">
        
        {/* Live Store Preview */}
        <div className="mb-6 flex flex-col items-center">
          <label className="block text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Store Preview</label>
          <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100 w-[160px]">
            <div className="w-full h-48 bg-indigo-50 rounded-xl overflow-hidden relative flex items-center justify-center">
              <img 
                src="/book-mockup.jpg" 
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

          {/* Price */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Price (₹)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <IndianRupee size={16} className="text-gray-400" />
              </div>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                min="0"
                step="1"
                placeholder="0 for Free"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors font-bold text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Leave as 0 to make it a free download.</p>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading || !file || !title}
            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] mt-6 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              "Publish Resource"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
