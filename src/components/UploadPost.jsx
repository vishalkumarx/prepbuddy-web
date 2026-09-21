import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ImagePlus, X, Upload, Plus, Trash2, Sparkles } from 'lucide-react';
import { UserManager } from '../utils/UserManager';

export default function UploadPost() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [mcqs, setMcqs] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('prepbuddy_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
      if (data && data.length > 0) {
        setSelectedSourceId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching sources:", err);
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

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const callGeminiApi = async () => {
    if (!imageFile) return;
    
    setIsGenerating(true);
    setError('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not set in .env.local");
      }

      const base64Image = await getBase64(imageFile);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Analyze this image. If it contains study material, extract text and generate up to 5 Multiple Choice Questions (MCQs). If it's a general image, just analyze what it is. Format the output EXACTLY as a JSON object with exactly three keys: 'headline' (a short 1-4 word catchy title), 'description' (a concise 1-2 sentence summary of the image), and 'mcqs' (an array of objects with keys: 'question', 'options' (array of strings), 'answer', and 'explanation'). If no MCQs can be generated, return an empty array [] for 'mcqs'. You MUST always include 'headline' and 'description' in your JSON response. Do not include any markdown formatting like ```json, just the raw JSON object."
              },
              {
                inlineData: {
                  mimeType: imageFile.type || "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let generatedText = data.candidates[0].content.parts[0].text.trim();
      
      if (generatedText.startsWith("```json")) {
        generatedText = generatedText.replace("```json", "");
      } else if (generatedText.startsWith("```")) {
        generatedText = generatedText.replace("```", "");
      }
      
      generatedText = generatedText.trim();
      
      if (generatedText.endsWith("```")) {
        generatedText = generatedText.substring(0, generatedText.length - 3);
      }

      const resultObj = JSON.parse(generatedText.trim());
      
      if (resultObj.headline) setHeadline(resultObj.headline);
      if (resultObj.description) setDescription(resultObj.description);
      
      if (resultObj.mcqs && Array.isArray(resultObj.mcqs)) {
        const parsedMcqs = resultObj.mcqs.map(mcq => ({
          question: mcq.question || '',
          optionA: mcq.options && mcq.options.length > 0 ? mcq.options[0] : '',
          optionB: mcq.options && mcq.options.length > 1 ? mcq.options[1] : '',
          optionC: mcq.options && mcq.options.length > 2 ? mcq.options[2] : '',
          optionD: mcq.options && mcq.options.length > 3 ? mcq.options[3] : '',
          answer: mcq.answer || '',
          explanation: mcq.explanation || ''
        }));
        setMcqs(parsedMcqs);
      }
      
    } catch (err) {
      console.error("Gemini API error:", err);
      setError(err.message || "Failed to generate content from image");
    } finally {
      setIsGenerating(false);
    }
  };

  const addMcq = () => {
    setMcqs([...mcqs, { question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', explanation: '' }]);
  };

  const updateMcq = (index, field, value) => {
    const updated = [...mcqs];
    updated[index][field] = value;
    setMcqs(updated);
  };

  const removeMcq = (index) => {
    setMcqs(mcqs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError('');

    try {
      let imageUrl = null;

      // 1. Upload Image
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

      // 2. Format MCQs
      const formattedMcqs = mcqs.map(m => ({
        question: m.question.trim(),
        options: [m.optionA.trim(), m.optionB.trim(), m.optionC.trim(), m.optionD.trim()].filter(Boolean),
        answer: m.answer.trim(),
        explanation: m.explanation.trim()
      })).filter(m => m.question); // only keep if there's a question

      // 3. Insert Post
      const { error: insertError } = await supabase
        .from('feed_posts')
        .insert([{
          headline: headline.trim() || null,
          description: description.trim() || null,
          image_url: imageUrl,
          tags: tags,
          mcqs: formattedMcqs,
          source_id: selectedSourceId || null
        }]);

      if (insertError) throw insertError;

      navigate('/');
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || 'Failed to upload post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-app-bg min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center sticky top-0 z-20 shadow-md">
        <button onClick={() => navigate(-1)} className="mr-4 hover:bg-white/10 p-1 rounded-full transition-colors">
          <X size={24} />
        </button>
        <h1 className="text-xl font-bold">Upload Post</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          
          {/* Image Upload */}
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
            
            {imagePreview && (
              <button
                onClick={callGeminiApi}
                disabled={isGenerating}
                className="w-full mt-3 bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Auto-Generate with AI</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline (Optional)</label>
            <input 
              type="text" 
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow"
              placeholder="e.g. Important Note on Economy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow min-h-[80px] resize-y"
              placeholder="Add some context..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select 
                value={selectedSourceId}
                onChange={e => setSelectedSourceId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {sources.map(src => (
                  <option key={src.id} value={src.id}>{src.name}</option>
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

          {/* MCQs Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">MCQs</h3>
            </div>

            <div className="space-y-6">
              {mcqs.map((mcq, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                  <button 
                    onClick={() => removeMcq(idx)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <h4 className="font-semibold text-gray-700 mb-3 text-sm">Question {idx + 1}</h4>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={mcq.question}
                      onChange={e => updateMcq(idx, 'question', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Enter question..."
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={mcq.optionA} onChange={e => updateMcq(idx, 'optionA', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary" placeholder="Option A" />
                      <input type="text" value={mcq.optionB} onChange={e => updateMcq(idx, 'optionB', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary" placeholder="Option B" />
                      <input type="text" value={mcq.optionC} onChange={e => updateMcq(idx, 'optionC', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary" placeholder="Option C" />
                      <input type="text" value={mcq.optionD} onChange={e => updateMcq(idx, 'optionD', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary" placeholder="Option D" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Correct Answer</label>
                        <input type="text" value={mcq.answer} onChange={e => updateMcq(idx, 'answer', e.target.value)} className="w-full bg-green-50 border border-green-200 text-green-900 rounded-lg p-2.5 text-sm outline-none focus:border-green-500" placeholder="e.g. Option A" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Explanation</label>
                        <input type="text" value={mcq.explanation} onChange={e => updateMcq(idx, 'explanation', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary" placeholder="Brief explanation..." />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {mcqs.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  No MCQs generated yet. Select an image and use "Auto-Generate with AI".
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!imageFile && !description && mcqs.length === 0)}
            className="w-full bg-secondary hover:bg-yellow-500 text-primary font-bold py-3.5 rounded-xl mt-8 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={20} />
                <span>Upload Post</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
