import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Upload, FileCode, Sparkles, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

export default function UploadJSONQuestions() {
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [category, setCategory] = useState('Senior Assistant');
  const [subcategory, setSubcategory] = useState('General Knowledge');
  const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  
  const [isFormatting, setIsFormatting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlSchema = `CREATE TABLE IF NOT EXISTS prepbuddy_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT,
    subcategory TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  // Parse raw JSON text
  const handleParseJSON = (text) => {
    setJsonText(text);
    setMessage(null);
    if (!text.trim()) {
      setParsedQuestions([]);
      return;
    }

    try {
      let data = JSON.parse(text);
      if (!Array.isArray(data)) {
        if (data.questions && Array.isArray(data.questions)) {
          data = data.questions;
        } else if (data.mcqs && Array.isArray(data.mcqs)) {
          data = data.mcqs;
        } else {
          data = [data];
        }
      }

      const formatted = data.map((q, idx) => ({
        id: idx + 1,
        question: q.question || q.q || q.title || '',
        options: Array.isArray(q.options) ? q.options : [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
        answer: q.answer || q.correct_answer || q.correctAnswer || q.optionA || '',
        explanation: q.explanation || q.desc || q.solution || '',
        category: q.category || category,
        subcategory: q.subcategory || subcategory
      }));

      setParsedQuestions(formatted);
      setMessage({ type: 'success', text: `Successfully parsed ${formatted.length} question(s)!` });
    } catch (err) {
      setParsedQuestions([]);
      setMessage({ type: 'error', text: 'Invalid JSON format. Click "Format with AI" if pasting raw text!' });
    }
  };

  // Upload JSON File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      handleParseJSON(event.target.result);
    };
    reader.readAsText(file);
  };

  // AI Formatting / Extraction using Gemini
  const handleAIFormat = async () => {
    if (!jsonText.trim()) {
      setMessage({ type: 'error', text: 'Please paste text or JSON first!' });
      return;
    }

    setIsFormatting(true);
    setMessage(null);

    try {
      const apiKey = geminiApiKey.trim();
      if (!apiKey) {
        throw new Error('Please enter your Gemini API key above before using AI formatting!');
      }
      const prompt = `Extract all multiple choice questions from the following text/JSON and format them EXACTLY as a JSON array of objects with keys: "question" (string), "options" (array of 4 string options), "answer" (the correct option text or letter), "explanation" (detailed explanation if present, else empty string), "category" ("${category}"), "subcategory" ("${subcategory}"). Return ONLY raw valid JSON array without markdown formatting like \`\`\`json. Text:\n${jsonText}`;

      // AQ. keys = new Google Auth Key format → use Bearer token in header
      // AIza keys = legacy API key format → use ?key= query param
      const isAQKey = apiKey.startsWith('AQ.');
      const url = isAQKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

      const headers = { 'Content-Type': 'application/json' };
      if (isAQKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        let errBody = '';
        try { const errJson = await response.json(); errBody = errJson?.error?.message || JSON.stringify(errJson); } catch (_) {}
        throw new Error(`HTTP ${response.status}: ${errBody || response.statusText}`);
      }

      const data = await response.json();
      let generatedText = data.candidates[0].content.parts[0].text.trim();
      
      if (generatedText.startsWith("```json")) generatedText = generatedText.replace("```json", "");
      if (generatedText.startsWith("```")) generatedText = generatedText.replace("```", "");
      if (generatedText.endsWith("```")) generatedText = generatedText.substring(0, generatedText.length - 3);

      handleParseJSON(generatedText.trim());
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'AI Formatting failed: ' + err.message });
    } finally {
      setIsFormatting(false);

    }
  };

  // Upload Questions to Supabase
  const handleUploadToSupabase = async () => {
    if (parsedQuestions.length === 0) {
      setMessage({ type: 'error', text: 'No parsed questions to upload!' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const recordsToInsert = parsedQuestions.map(q => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation || null,
        category: category,
        subcategory: subcategory
      }));

      const { data, error } = await supabase
        .from('prepbuddy_questions')
        .insert(recordsToInsert);

      if (error) {
        if (error.code === '42P01') { // table does not exist
          throw new Error('Table "prepbuddy_questions" does not exist in Supabase yet. Please run the SQL schema script below in your Supabase SQL Editor!');
        }
        throw error;
      }

      setMessage({ type: 'success', text: `🎉 Successfully stored ${parsedQuestions.length} question(s) in Supabase database!` });
      setJsonText('');
      setParsedQuestions([]);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to store questions in Supabase.' });
    } finally {
      setIsUploading(false);
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="bg-app-bg min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold">Upload JSON Questions</h1>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-6">

        {/* Gemini API Key Input */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm space-y-2 hidden">
          <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
            🔑 Gemini API Key (required for AI formatting)
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Paste your Gemini API key here (AIza... or AQ...)"
            className="w-full bg-white border border-amber-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
          />
          <p className="text-xs text-amber-700">Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold">aistudio.google.com</a>. Both <code className="bg-amber-100 px-1 rounded font-mono">AIza...</code> and new <code className="bg-amber-100 px-1 rounded font-mono">AQ...</code> key formats are supported.</p>
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-bold text-amber-800 whitespace-nowrap">Model:</label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (recommended)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
            </select>
          </div>
        </div>
        
        {/* Category & Subcategory Selectors */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Category / Exam</label>
            <input 
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Senior Assistant, ASI, UPSC"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subcategory / Subject</label>
            <input 
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. Punjab GK, Current Affairs, Reasoning"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* Input Methods Section */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileCode size={18} className="text-primary" />
              Paste JSON or Question Text
            </h2>
            <label className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
              Choose .json File
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea 
            value={jsonText}
            onChange={(e) => handleParseJSON(e.target.value)}
            rows={8}
            placeholder={`Paste raw JSON array or question text here, e.g.\n[\n  {\n    "question": "Capital of Punjab?",\n    "options": ["Chandigarh", "Amritsar", "Ludhiana", "Patiala"],\n    "answer": "Chandigarh"\n  }\n]`}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={handleAIFormat}
              disabled={isFormatting || !jsonText.trim()}
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50 active:scale-95"
            >
              {isFormatting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Format / Extract with AI
                </>
              )}
            </button>

            {parsedQuestions.length > 0 && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                {parsedQuestions.length} Question(s) Validated
              </span>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl text-sm border flex items-start gap-2.5 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            <span className="font-medium leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Parsed Preview Section */}
        {parsedQuestions.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Questions Preview ({parsedQuestions.length})</h3>
              <button
                onClick={handleUploadToSupabase}
                disabled={isUploading}
                className="bg-primary hover:bg-primary-light text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Store in Supabase Database
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      Q{idx + 1}. {q.question}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {q.options?.map((opt, oIdx) => (
                      <div 
                        key={oIdx} 
                        className={`p-2 rounded-lg border ${
                          opt === q.answer || opt.toLowerCase().startsWith(q.answer?.toLowerCase())
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-gray-500 italic pt-1 border-t border-gray-200">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Setup Helper */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-yellow-400">Database Table Setup (SQL Script)</h3>
            <button
              onClick={copySqlToClipboard}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedSql ? 'Copied SQL!' : 'Copy SQL'}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Run this query in your Supabase SQL Editor once to create the <code className="text-yellow-300">prepbuddy_questions</code> table if you haven't already:
          </p>
          <pre className="bg-slate-950 p-3 rounded-xl text-[11px] font-mono overflow-x-auto text-emerald-400 border border-slate-800">
            {sqlSchema}
          </pre>
        </div>

      </div>
    </div>
  );
}
