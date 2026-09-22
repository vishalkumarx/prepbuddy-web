import React, { useState } from 'react';
import { supabase } from '../supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Upload, Image as ImageIcon, Send, Save, Loader2, FileJson, AlertCircle } from 'lucide-react';

export default function UploadAIQuestions() {
  const [questionImg, setQuestionImg] = useState(null);
  const [explanationImg, setExplanationImg] = useState(null);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Convert File to base64 for Gemini
  const fileToGenerativePart = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result is like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        // We only want the base64 part for Gemini
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: { data: base64Data, mimeType: file.type }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractWithAI = async () => {
    if (!questionImg || !explanationImg) {
      setError("Please upload both Question and Explanation images.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setExtractedQuestions([]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const qPart = await fileToGenerativePart(questionImg);
      const ePart = await fileToGenerativePart(explanationImg);

      const prompt = `
        You are an expert OCR parser for educational content. 
        I am providing you with two images:
        Image 1: Contains multiple choice questions and their options.
        Image 2: Contains the explanations and correct answers for those questions.
        
        Please parse both images and match the explanation to the correct question.
        Return the data as a STRICT JSON array of objects. Do not use markdown wrappers, just return raw JSON.
        
        The JSON should look exactly like this structure:
        [
          {
            "question_text": "What is the capital of India?",
            "options": ["Delhi", "Mumbai", "Kolkata", "Chennai"],
            "correct_answer": "Delhi",
            "explanation": "Delhi is the capital of India because..."
          }
        ]
      `;

      const result = await model.generateContent([prompt, qPart, ePart]);
      const response = await result.response;
      let text = response.text();
      
      // Clean up markdown if Gemini wrapped it
      if (text.startsWith('```json')) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const parsedJSON = JSON.parse(text);
      setExtractedQuestions(parsedJSON);
    } catch (err) {
      console.error(err);
      setError("Failed to extract data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (extractedQuestions.length === 0) return;
    if (!category.trim()) {
      setError("Please enter a category before saving.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const rows = extractedQuestions.map(q => ({
        category,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      }));

      const { error: insertError } = await supabase
        .from('prepbuddy_questions')
        .insert(rows);

      if (insertError) throw insertError;
      
      setSuccess(true);
      setExtractedQuestions([]);
      setQuestionImg(null);
      setExplanationImg(null);
      setCategory('');
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save to database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonEdit = (index, field, value) => {
    const updated = [...extractedQuestions];
    if (field === 'options') {
      updated[index][field] = value.split(',').map(s => s.trim());
    } else {
      updated[index][field] = value;
    }
    setExtractedQuestions(updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileJson className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-800">AI Question Extractor</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
          Questions successfully saved to the database!
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category / Test Series Name</label>
          <input 
            type="text" 
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. UPSC Mains 2026 Test 1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">1. Questions Image</label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setQuestionImg(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600 text-center">
                {questionImg ? questionImg.name : "Click or drag image here"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">2. Explanations Image</label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setExplanationImg(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600 text-center">
                {explanationImg ? explanationImg.name : "Click or drag image here"}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={extractWithAI}
          disabled={loading || !questionImg || !explanationImg}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading && extractedQuestions.length === 0 ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Extracting with Gemini AI...</>
          ) : (
            <><Send className="w-5 h-5" /> Extract Questions with AI</>
          )}
        </button>
      </div>

      {extractedQuestions.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Preview & Edit ({extractedQuestions.length} questions)</h2>
            <button 
              onClick={saveToDatabase}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save to Database
            </button>
          </div>

          <div className="space-y-6">
            {extractedQuestions.map((q, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="font-medium text-gray-700">Question {idx + 1}</div>
                
                <textarea 
                  value={q.question_text}
                  onChange={(e) => handleJsonEdit(idx, 'question_text', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  rows={2}
                />
                
                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold">Options (comma separated)</label>
                  <input 
                    type="text" 
                    value={q.options?.join(', ')}
                    onChange={(e) => handleJsonEdit(idx, 'options', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold">Correct Answer</label>
                  <input 
                    type="text" 
                    value={q.correct_answer}
                    onChange={(e) => handleJsonEdit(idx, 'correct_answer', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 border-l-4 border-l-green-500 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-semibold">Explanation</label>
                  <textarea 
                    value={q.explanation}
                    onChange={(e) => handleJsonEdit(idx, 'explanation', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 mt-1"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
