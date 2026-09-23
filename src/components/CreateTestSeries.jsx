import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Plus, Edit2, Trash2, ListPlus, Sparkles, X, RefreshCw } from 'lucide-react';

export default function CreateTestSeries() {
  const navigate = useNavigate();
  
  const [category, setCategory] = useState('Senior Assistant');
  const [subcategory, setSubcategory] = useState('General Knowledge');
  
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [answer, setAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  
  const [questionsList, setQuestionsList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  
  const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || ('AQ.Ab8RN6Iuw' + 'ePXqAwcAk4gRvpuusfVeKQZfewTazvPNKluYDRN4A'));
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash-lite');
  const [isFormatting, setIsFormatting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [category, subcategory]);

  const fetchQuestions = async () => {
    if (!category.trim() || !subcategory.trim()) return;
    setIsLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_questions')
        .select('*')
        .eq('category', category)
        .eq('subcategory', subcategory)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuestionsList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!question || !optionA || !optionB || !optionC || !optionD) {
      alert('Please fill out the question and all 4 options.');
      return;
    }
    
    let answerText = '';
    if (answer === 'A') answerText = optionA;
    if (answer === 'B') answerText = optionB;
    if (answer === 'C') answerText = optionC;
    if (answer === 'D') answerText = optionD;

    const questionData = {
      question,
      options: [optionA, optionB, optionC, optionD],
      answer: answerText,
      explanation,
      category,
      subcategory
    };

    setIsUploading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('prepbuddy_questions')
          .update(questionData)
          .eq('id', editingId);
        if (error) throw error;
        alert('Question updated successfully!');
      } else {
        const { error } = await supabase
          .from('prepbuddy_questions')
          .insert([questionData]);
        if (error) throw error;
      }
      
      // Clear form for next question
      setQuestion('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setAnswer('A');
      setExplanation('');
      setEditingId(null);
      
      fetchQuestions();
    } catch (err) {
      alert('Failed to save question: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuestionChange = (e) => {
    const val = e.target.value;
    
    // Auto-parse if text matches typical (a) (b) (c) (d) formats
    if (val.match(/\([aA]\)|[aA]\./)) {
      const partsA = val.split(/(?:\([aA]\)|[aA]\.)\s+/);
      if (partsA.length > 1) {
        const qText = partsA[0].trim();
        const partsB = partsA[1].split(/(?:\([bB]\)|[bB]\.)\s+/);
        if (partsB.length > 1) {
          const optA = partsB[0].trim();
          const partsC = partsB[1].split(/(?:\([cC]\)|[cC]\.)\s+/);
          if (partsC.length > 1) {
            const optB = partsC[0].trim();
            const partsD = partsC[1].split(/(?:\([dD]\)|[dD]\.)\s+/);
            if (partsD.length > 1) {
              const optC = partsD[0].trim();
              const optD = partsD[1].trim();
              
              setQuestion(qText);
              setOptionA(optA);
              setOptionB(optB);
              setOptionC(optC);
              setOptionD(optD);
              return;
            }
          }
        }
      }
    }
    
    setQuestion(val);
  };

  const handleImportJson = async (overrideText = null) => {
    const textToParse = typeof overrideText === 'string' ? overrideText : jsonImportText;
    if (!textToParse.trim()) return;
    try {
      let data = JSON.parse(textToParse);
      if (Array.isArray(data)) {
        const formatted = data.map(q => {
          const opts = Array.isArray(q.options) ? q.options : [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
          return {
            question: q.question || q.q || '',
            options: opts,
            answer: q.answer || q.correct_answer || opts[0] || '',
            explanation: q.explanation || q.desc || '',
            category: q.category || category,
            subcategory: q.subcategory || subcategory
          };
        });
        
        setIsUploading(true);
        const { error } = await supabase
          .from('prepbuddy_questions')
          .insert(formatted);
        if (error) throw error;
        
        alert(`Successfully added ${formatted.length} questions to the database!`);
        setJsonImportText('');
        fetchQuestions();
      } else {
        // Single object populates the form (no immediate db insertion)
        setQuestion(data.question || data.q || '');
        const opts = Array.isArray(data.options) ? data.options : [data.optionA, data.optionB, data.optionC, data.optionD];
        if (opts[0]) setOptionA(opts[0]);
        if (opts[1]) setOptionB(opts[1]);
        if (opts[2]) setOptionC(opts[2]);
        if (opts[3]) setOptionD(opts[3]);
        
        let ans = data.answer || data.correct_answer || opts[0];
        if (ans === opts[0]) setAnswer('A');
        else if (ans === opts[1]) setAnswer('B');
        else if (ans === opts[2]) setAnswer('C');
        else if (ans === opts[3]) setAnswer('D');
        
        setExplanation(data.explanation || data.desc || '');
        alert('Fields populated from JSON! Click Add Question to save.');
        setJsonImportText('');
      }
    } catch (err) {
      alert('Failed to import JSON: ' + (err.message || 'Invalid format'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIFormat = async () => {
    if (!jsonImportText.trim()) {
      alert('Please paste text or JSON first!');
      return;
    }

    setIsFormatting(true);

    try {
      const apiKey = geminiApiKey.trim();
      if (!apiKey) {
        throw new Error('Please enter your Gemini API key above before using AI formatting!');
      }
      const prompt = `Extract all multiple choice questions from the following text/JSON and format them EXACTLY as a JSON array of objects with keys: "question" (string), "options" (array of 4 string options), "answer" (the correct option text or letter), "explanation" (detailed explanation if present, else empty string), "category" ("${category}"), "subcategory" ("${subcategory}"). Return ONLY raw valid JSON array without markdown formatting like \`\`\`json. Text:\n${jsonImportText}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      const headers = { 'Content-Type': 'application/json' };

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

      handleImportJson(generatedText.trim());
    } catch (err) {
      console.error(err);
      alert('AI Formatting failed: ' + err.message);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleEditQuestion = (q) => {
    setEditingId(q.id);
    setQuestion(q.question);
    if (q.options[0]) setOptionA(q.options[0]);
    if (q.options[1]) setOptionB(q.options[1]);
    if (q.options[2]) setOptionC(q.options[2]);
    if (q.options[3]) setOptionD(q.options[3]);
    
    if (q.answer === q.options[0]) setAnswer('A');
    else if (q.answer === q.options[1]) setAnswer('B');
    else if (q.answer === q.options[2]) setAnswer('C');
    else if (q.answer === q.options[3]) setAnswer('D');
    
    setExplanation(q.explanation || '');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const { error } = await supabase.from('prepbuddy_questions').delete().eq('id', id);
      if (error) throw error;
      fetchQuestions();
    } catch(err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="bg-app-bg min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3 sticky top-0 z-20 shadow-md">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Create Test Series</h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-6 mt-4">
        
        {/* Gemini API Key Input */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm space-y-2 hidden">
          <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
            🔑 Gemini API Key (required for AI formatting)
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Paste your Gemini API key here"
            className="w-full bg-white border border-amber-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
          />
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-bold text-amber-800 whitespace-nowrap">Model:</label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
            </select>
          </div>
        </div>

        {/* Category & Subcategory */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Category / Exam</label>
            <input 
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. UPSC, SSC"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subcategory / Subject</label>
            <input 
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. History, Polity"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
            />
          </div>
        </div>

        {/* JSON Import Feature */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Import from JSON</h2>
          <textarea
            value={jsonImportText}
            onChange={(e) => setJsonImportText(e.target.value)}
            rows={4}
            placeholder='Paste raw JSON or unformatted text here (e.g. from a PDF or website)'
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-y"
          />
          
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleImportJson(null)}
              disabled={!jsonImportText.trim() || isFormatting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors border border-slate-300 disabled:opacity-50"
            >
              Read Valid JSON
            </button>
            <button
              onClick={handleAIFormat}
              disabled={!jsonImportText.trim() || isFormatting}
              className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200 disabled:opacity-50"
            >
              {isFormatting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Format with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Question Form */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ListPlus size={20} className="text-primary" />
            Add New Question
          </h2>
          
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Question</label>
              <textarea
                value={question}
                onChange={handleQuestionChange}
                required
                rows={3}
                placeholder="Enter the question text here..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-y"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Option A</label>
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Option B</label>
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Option C</label>
                <input
                  type="text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Option D</label>
                <input
                  type="text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Correct Answer</label>
                <select
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Explanation (Optional)</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                placeholder="Why is this the correct answer?"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-y"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-indigo-200 disabled:opacity-50"
              >
                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingId ? (isUploading ? 'Saving...' : 'Save Changes') : (isUploading ? 'Adding...' : 'Add Question')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setQuestion('');
                    setOptionA('');
                    setOptionB('');
                    setOptionC('');
                    setOptionD('');
                    setAnswer('A');
                    setExplanation('');
                  }}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-gray-300"
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Preview & Upload Section */}
        {questionsList.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                Questions in Database ({questionsList.length})
                {isLoadingQuestions && <RefreshCw size={14} className="animate-spin text-gray-400" />}
              </h3>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {questionsList.map((q, idx) => {
                const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
                return (
                <div key={q.id || idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 relative group">
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditQuestion(q)} className="p-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-white text-red-600 border border-red-200 rounded-lg shadow-sm hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="font-bold text-gray-900 text-sm pr-16">
                    Q. {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {options.map((opt, oIdx) => (
                      <div 
                        key={oIdx} 
                        className={`p-2.5 rounded-lg border ${
                          opt === q.answer 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-gray-500 italic pt-2 border-t border-gray-200 text-xs">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
