import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Plus, Edit2, Trash2, ListPlus, Sparkles, X, RefreshCw, Link2 } from 'lucide-react';

export default function CreateTestSeries() {
  const navigate = useNavigate();
  
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  
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
  const [sidebarGroups, setSidebarGroups] = useState([]);
  const [stagedChunks, setStagedChunks] = useState([]);
  const [chunkSize, setChunkSize] = useState("");
  const [saveInChunks, setSaveInChunks] = useState(false);
  const [courses, setCourses] = useState([]);
  const [linkModalGroup, setLinkModalGroup] = useState(null);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from('prepbuddy_test_series').select('*');
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [category, subcategory]);

  useEffect(() => {
    fetchSidebarGroups();
    fetchCourses();
  }, []);

  const fetchSidebarGroups = async () => {
    try {
      let allData = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('prepbuddy_questions')
          .select('category, subcategory')
          .range(from, to);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += 1000;
          to += 1000;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      
      const uniqueMap = {};
      allData.forEach(item => {
        const key = `${item.category}:::${item.subcategory}`;
        if (!uniqueMap[key]) {
          uniqueMap[key] = { category: item.category, subcategory: item.subcategory, count: 0 };
        }
        uniqueMap[key].count += 1;
      });
      
      setSidebarGroups(Object.values(uniqueMap).sort((a, b) => a.category.localeCompare(b.category)));
    } catch (err) {
      console.error('Failed to fetch sidebar groups:', err);
    }
  };

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
    if (!category.trim() || !subcategory.trim()) {
      alert('Please fill out the Category and Subcategory fields.');
      return;
    }
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
      fetchSidebarGroups();
    } catch (err) {
      alert('Failed to save question: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuestionChange = (e) => {
    const val = e.target.value;
    
    // Try to parse as JSON first
    if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
      try {
        let data = JSON.parse(val);
        if (Array.isArray(data)) data = data[0]; // If array pasted, just take the first one
        if (data && typeof data === 'object') {
          setQuestion(data.question || data.q || '');
          const opts = Array.isArray(data.options) ? data.options : [data.optionA, data.optionB, data.optionC, data.optionD];
          if (opts[0]) setOptionA(opts[0]);
          if (opts[1]) setOptionB(opts[1]);
          if (opts[2]) setOptionC(opts[2]);
          if (opts[3]) setOptionD(opts[3]);
          
          let ans = data.answer || data.correct_answer || opts[0];
          if (ans === opts[0] || String(ans).toUpperCase() === 'A') setAnswer('A');
          else if (ans === opts[1] || String(ans).toUpperCase() === 'B') setAnswer('B');
          else if (ans === opts[2] || String(ans).toUpperCase() === 'C') setAnswer('C');
          else if (ans === opts[3] || String(ans).toUpperCase() === 'D') setAnswer('D');
          
          setExplanation(data.explanation || data.desc || '');
          return;
        }
      } catch (err) {
        // Fall back to text parsing if JSON is invalid
      }
    }
    
    // Check if it has all 4 option markers
    const regexA = /(?:^|\n|\s)\s*(?:\([aA1]\)|[aA1]\.)\s*/;
    const regexB = /(?:^|\n|\s)\s*(?:\([bB2]\)|[bB2]\.)\s*/;
    const regexC = /(?:^|\n|\s)\s*(?:\([cC3]\)|[cC3]\.)\s*/;
    const regexD = /(?:^|\n|\s)\s*(?:\([dD4]\)|[dD4]\.)\s*/;
    
    const matchA = val.match(regexA);
    const matchB = val.match(regexB);
    const matchC = val.match(regexC);
    const matchD = val.match(regexD);
    
    if (matchA && matchB && matchC && matchD) {
      // Collect indices
      const indices = [
        { id: 'A', index: matchA.index, length: matchA[0].length },
        { id: 'B', index: matchB.index, length: matchB[0].length },
        { id: 'C', index: matchC.index, length: matchC[0].length },
        { id: 'D', index: matchD.index, length: matchD[0].length }
      ];
      
      // Sort by index to find the order they appear
      indices.sort((a, b) => a.index - b.index);
      
      const qText = val.substring(0, indices[0].index).trim();
      
      const optionsText = {};
      for (let i = 0; i < indices.length; i++) {
        const current = indices[i];
        const next = indices[i + 1];
        const start = current.index + current.length;
        const end = next ? next.index : val.length;
        optionsText[current.id] = val.substring(start, end).trim();
      }
      
      setQuestion(qText);
      setOptionA(optionsText['A']);
      setOptionB(optionsText['B']);
      setOptionC(optionsText['C']);
      setOptionD(optionsText['D']);
      return;
    }
    
    // Fallback to sequential regex just in case
    const regex = /([\s\S]*?)(?:^|\n|\s)\s*(?:\([aA1]\)|[aA1]\.)\s*([\s\S]*?)(?:^|\n|\s)\s*(?:\([bB2]\)|[bB2]\.)\s*([\s\S]*?)(?:^|\n|\s)\s*(?:\([cC3]\)|[cC3]\.)\s*([\s\S]*?)(?:^|\n|\s)\s*(?:\([dD4]\)|[dD4]\.)\s*([\s\S]*)/;
    const match = val.match(regex);
    
    if (match) {
      setQuestion(match[1].trim());
      setOptionA(match[2].trim());
      setOptionB(match[3].trim());
      setOptionC(match[4].trim());
      setOptionD(match[5].trim());
      return;
    }
    
    setQuestion(val);
  };

  const handleImportJson = async (overrideText = null) => {
    if (!category.trim() || !subcategory.trim()) {
      alert('Please fill out the Category and Subcategory fields before importing JSON.');
      return;
    }
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
            category: category,
            subcategory: subcategory
          };
        });
        const size = parseInt(chunkSize, 10);
        if (saveInChunks && !isNaN(size) && size > 0) {
          const newChunks = [];
          for (let i = 0; i < formatted.length; i += size) {
            const testNum = Math.floor(i / size) + 1;
            newChunks.push({
              name: `${subcategory} - Test ${String(testNum).padStart(2, '0')}`,
              questions: formatted.slice(i, i + size)
            });
          }
          setStagedChunks(newChunks);
        } else {
          setStagedChunks([{ name: subcategory, questions: formatted }]);
        }
        
        setJsonImportText('');
        alert(`Successfully parsed ${formatted.length} questions! Review them below and click 'Save All to Database'.`);
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

  const handleChunkSizeChange = (e) => {
    const newSize = e.target.value;
    setChunkSize(newSize);
    if (stagedChunks.length === 0) return;
    
    const allQs = stagedChunks.flatMap(c => c.questions);
    const size = parseInt(newSize, 10);
    
    if (isNaN(size) || size <= 0) {
      setStagedChunks([{ name: subcategory, questions: allQs }]);
      return;
    }
    
    const newChunks = [];
    for (let i = 0; i < allQs.length; i += size) {
      const testNum = Math.floor(i / size) + 1;
      newChunks.push({
        name: `${subcategory} - Test ${String(testNum).padStart(2, '0')}`,
        questions: allQs.slice(i, i + size)
      });
    }
    setStagedChunks(newChunks);
  };

  const handleBulkUpload = async () => {
    if (stagedChunks.length === 0) return;
    if (!category.trim() || !subcategory.trim()) {
      alert('Please fill out the Category and Subcategory fields before saving.');
      return;
    }
    setIsUploading(true);
    try {
      const finalQuestions = [];
      stagedChunks.forEach(chunk => {
        chunk.questions.forEach(q => {
          finalQuestions.push({ ...q, subcategory: chunk.name, category: category });
        });
      });
      
      const { error } = await supabase
        .from('prepbuddy_questions')
        .insert(finalQuestions);
      if (error) throw error;
      
      alert(`🎉 Successfully uploaded ${finalQuestions.length} questions to the database!`);
      setStagedChunks([]);
      setChunkSize("");
      fetchQuestions();
      fetchSidebarGroups();
    } catch (err) {
      alert('Failed to upload questions: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadChunk = async (chunkIndex) => {
    const chunk = stagedChunks[chunkIndex];
    if (!chunk || chunk.questions.length === 0) return;
    if (!category.trim() || !subcategory.trim()) {
      alert('Please fill out the Category and Subcategory fields before saving.');
      return;
    }
    
    setIsUploading(true);
    try {
      const finalQuestions = chunk.questions.map(q => ({
        ...q,
        subcategory: chunk.name,
        category: category
      }));
      
      const { error } = await supabase
        .from('prepbuddy_questions')
        .insert(finalQuestions);
      if (error) throw error;
      
      alert(`🎉 Successfully uploaded ${finalQuestions.length} questions for ${chunk.name}!`);
      
      const updatedChunks = [...stagedChunks];
      updatedChunks.splice(chunkIndex, 1);
      setStagedChunks(updatedChunks);
      
      fetchQuestions();
      fetchSidebarGroups();
    } catch (err) {
      alert('Failed to upload test: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTestSeries = async (e, groupCategory, groupSubcategory) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the ENTIRE test series "${groupSubcategory}"? This will permanently delete all questions in it.`)) return;
    
    try {
      const { error } = await supabase
        .from('prepbuddy_questions')
        .delete()
        .eq('category', groupCategory)
        .eq('subcategory', groupSubcategory);
        
      if (error) throw error;
      
      if (category === groupCategory && subcategory === groupSubcategory) {
        setQuestionsList([]);
      }
      
      fetchSidebarGroups();
      alert(`Test series "${groupSubcategory}" deleted successfully!`);
    } catch (err) {
      alert("Failed to delete test series: " + err.message);
    }
  };


  const handleRenameCategory = async (e, groupCategory, groupSubcategory) => {
    e.stopPropagation();
    const newName = window.prompt("Enter new category name for this test series:", groupCategory);
    if (!newName || newName.trim() === '' || newName.trim() === groupCategory) return;
    
    const finalNewName = newName.trim();
    
    try {
      const { error: qError } = await supabase
        .from('prepbuddy_questions')
        .update({ category: finalNewName })
        .eq('category', groupCategory)
        .eq('subcategory', groupSubcategory);
        
      if (qError) throw qError;
      
      for (const course of courses) {
        if (!course.linked_tests) continue;
        const hasLink = course.linked_tests.some(l => l.category === groupCategory && l.subcategory === groupSubcategory);
        if (hasLink) {
          const updatedLinks = course.linked_tests.map(l => {
            if (l.category === groupCategory && l.subcategory === groupSubcategory) {
              return { ...l, category: finalNewName };
            }
            return l;
          });
          
          await supabase
            .from('prepbuddy_test_series')
            .update({ linked_tests: updatedLinks })
            .eq('id', course.id);
        }
      }
      
      if (category === groupCategory) {
        setCategory(finalNewName);
      }
      
      fetchSidebarGroups();
      fetchCourses();
      alert("Category renamed successfully!");
    } catch (err) {
      alert("Failed to rename category: " + err.message);
    }
  };

  const handleRenameTestSeries = async (e, groupCategory, groupSubcategory) => {
    e.stopPropagation();
    const newName = window.prompt("Enter new name for this test series:", groupSubcategory);
    if (!newName || newName.trim() === '' || newName.trim() === groupSubcategory) return;
    
    const finalNewName = newName.trim();
    
    try {
      const { error: qError } = await supabase
        .from('prepbuddy_questions')
        .update({ subcategory: finalNewName })
        .eq('category', groupCategory)
        .eq('subcategory', groupSubcategory);
        
      if (qError) throw qError;
      
      for (const course of courses) {
        if (!course.linked_tests) continue;
        const hasLink = course.linked_tests.some(l => l.category === groupCategory && l.subcategory === groupSubcategory);
        if (hasLink) {
          const updatedLinks = course.linked_tests.map(l => {
            if (l.category === groupCategory && l.subcategory === groupSubcategory) {
              return { ...l, subcategory: finalNewName };
            }
            return l;
          });
          
          await supabase
            .from('prepbuddy_test_series')
            .update({ linked_tests: updatedLinks })
            .eq('id', course.id);
        }
      }
      
      if (category === groupCategory && subcategory === groupSubcategory) {
        setSubcategory(finalNewName);
      }
      
      fetchSidebarGroups();
      fetchCourses();
      alert("Test series renamed successfully!");
    } catch (err) {
      alert("Failed to rename test series: " + err.message);
    }
  };

  const handleToggleLink = async (course, group) => {
    try {
      const currentLinks = course.linked_tests || [];
      const isLinked = currentLinks.some(l => l.category === group.category && l.subcategory === group.subcategory);
      
      let newLinks;
      if (isLinked) {
        newLinks = currentLinks.filter(l => !(l.category === group.category && l.subcategory === group.subcategory));
      } else {
        newLinks = [...currentLinks, { category: group.category, subcategory: group.subcategory }];
      }
      
      // Optimistic update
      setCourses(courses.map(c => c.id === course.id ? { ...c, linked_tests: newLinks } : c));
      
      const { error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: newLinks })
        .eq('id', course.id);
        
      if (error) {
        fetchCourses(); // revert on fail
        throw error;
      }
    } catch (err) {
      alert("Failed to link course: " + err.message);
    }
  };

  const handleRemoveStaged = (chunkIdx, qIdx) => {
    const updated = [...stagedChunks];
    updated[chunkIdx].questions.splice(qIdx, 1);
    
    // Remove chunk if empty
    if (updated[chunkIdx].questions.length === 0) {
      updated.splice(chunkIdx, 1);
    }
    
    setStagedChunks(updated);
  };

  const handleEditQuestion = (q) => {
    setEditingId(q.id);
    setQuestion(q.question);
    
    const opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
    
    if (opts[0]) setOptionA(opts[0]);
    if (opts[1]) setOptionB(opts[1]);
    if (opts[2]) setOptionC(opts[2]);
    if (opts[3]) setOptionD(opts[3]);
    
    if (q.answer === opts[0]) setAnswer('A');
    else if (q.answer === opts[1]) setAnswer('B');
    else if (q.answer === opts[2]) setAnswer('C');
    else if (q.answer === opts[3]) setAnswer('D');
    else setAnswer(q.answer);
    
    setExplanation(q.explanation || '');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const { error } = await supabase.from('prepbuddy_questions').delete().eq('id', id);
      if (error) throw error;
      fetchQuestions();
      fetchSidebarGroups();
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

      <div className="p-4 max-w-6xl mx-auto mt-2 flex flex-col md:flex-row gap-6 items-start">
        
        {/* Sidebar */}
        <div className="w-full md:w-1/3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm sticky top-20 max-h-[85vh] overflow-y-auto">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Your Uploaded Tests</h3>
          
          {sidebarGroups.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No tests found in database.</p>
          ) : (
            <div className="space-y-2">
              {sidebarGroups.map((group, idx) => {
                const isActive = group.category === category && group.subcategory === subcategory;
                const linkedCoursesCount = courses.filter(c => 
                  (c.linked_tests || []).some(l => l.category === group.category && l.subcategory === group.subcategory)
                ).length;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCategory(group.category);
                      setSubcategory(group.subcategory);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full group/sidebar relative cursor-pointer text-left p-3 rounded-xl border text-sm transition-all flex flex-col ${
                      isActive 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500' 
                        : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                        <p className={`font-bold truncate ${isActive ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {group.category}
                        </p>
                        <button 
                          onClick={(e) => handleRenameCategory(e, group.category, group.subcategory)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0 opacity-0 group-hover/sidebar:opacity-100"
                          title="Rename Category"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <div className="opacity-0 group-hover/sidebar:opacity-100 flex items-center gap-1 z-10 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLinkModalGroup(group); }}
                          title="Link to Course"
                          className="p-1.5 bg-white text-indigo-600 rounded-md shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-opacity"
                        >
                          <Link2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => handleRenameTestSeries(e, group.category, group.subcategory)}
                          title="Rename test series"
                          className="p-1.5 bg-white text-gray-600 rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-opacity"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteTestSeries(e, group.category, group.subcategory)}
                          title="Delete entire test series"
                          className="p-1.5 bg-white text-red-600 rounded-md shadow-sm border border-red-100 hover:bg-red-50 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs truncate max-w-[50%] ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {group.subcategory}
                      </p>
                      <div className="flex items-center gap-1">
                        {linkedCoursesCount > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700'}`}>
                            🔗 {linkedCoursesCount}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                          {group.count} Qs
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-full md:w-2/3 space-y-6">
          
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Category / Exam <span className="text-red-500">*</span></label>
            <input 
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. UPSC, SSC"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subcategory / Subject <span className="text-red-500">*</span></label>
            <input 
              type="text"
              required
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

        {/* Staging Area for JSON Uploads */}
        {stagedChunks.length > 0 && (
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
            <div className="flex flex-col gap-4 border-b border-amber-200/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-6">
                  <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                    Ready to Upload ({stagedChunks.reduce((acc, c) => acc + c.questions.length, 0)})
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio"
                        name="saveMode"
                        checked={!saveInChunks}
                        onChange={() => {
                          setSaveInChunks(false);
                          setStagedChunks([{ name: subcategory, questions: stagedChunks.flatMap(c => c.questions) }]);
                        }}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-bold text-amber-900">Save in a single test</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="saveMode"
                        checked={saveInChunks}
                        onChange={() => {
                          setSaveInChunks(true);
                          const allQs = stagedChunks.flatMap(c => c.questions);
                          const size = parseInt(chunkSize, 10);
                          if (!isNaN(size) && size > 0) {
                            const newChunks = [];
                            for (let i = 0; i < allQs.length; i += size) {
                              const testNum = Math.floor(i / size) + 1;
                              newChunks.push({
                                name: `${subcategory} - Test ${String(testNum).padStart(2, '0')}`,
                                questions: allQs.slice(i, i + size)
                              });
                            }
                            setStagedChunks(newChunks);
                          }
                        }}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-bold text-amber-900">Save in chunks</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => setStagedChunks([])}
                  disabled={isUploading}
                  className="px-4 py-2 bg-white text-gray-700 font-bold text-sm rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Clear All
                </button>
              </div>

              <div>
                {saveInChunks ? (
                  <div className="flex flex-wrap items-center gap-3 bg-white/60 p-3 rounded-lg border border-amber-200/60 shadow-sm inline-flex">
                    <div className="flex items-center gap-2 mr-2">
                      <span className="text-xs font-bold text-gray-600">Chunk size:</span>
                      <input 
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={chunkSize}
                        onChange={handleChunkSizeChange}
                        className="w-16 text-sm font-bold text-amber-900 border-b border-amber-300 focus:border-amber-500 focus:outline-none text-center bg-transparent"
                      />
                    </div>
                    <button
                      onClick={handleBulkUpload}
                      disabled={isUploading}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isUploading ? 'Uploading...' : 'Save all chunks at once'}
                    </button>
                    <button
                      onClick={() => handleUploadChunk(0)}
                      disabled={isUploading || stagedChunks.length === 0}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Save single chunk'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkUpload}
                      disabled={isUploading}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isUploading ? 'Uploading...' : 'Save in a single test'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {stagedChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="space-y-4">
                  
                  {/* Chunk Header */}
                  {saveInChunks && (
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-100 px-3 py-1 rounded-full whitespace-nowrap">
                          Chunk {chunkIdx + 1}
                        </span>
                        <input 
                          type="text"
                          value={chunk.name}
                          onChange={(e) => {
                            const updated = [...stagedChunks];
                            updated[chunkIdx].name = e.target.value;
                            setStagedChunks(updated);
                          }}
                          placeholder="Test Name..."
                          className="flex-1 min-w-0 bg-transparent text-sm font-bold text-gray-900 focus:outline-none border-b border-dashed border-gray-300 focus:border-amber-500 pb-1"
                        />
                      </div>
                      <button
                        onClick={() => handleUploadChunk(chunkIdx)}
                        disabled={isUploading}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        Save this Chunk
                      </button>
                    </div>
                  )}

                  {/* Chunk Questions */}
                  <div className="space-y-3 pl-2 sm:pl-6 border-l-2 border-amber-100">
                    {chunk.questions.map((q, qIdx) => {
                      const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
                      return (
                      <div key={qIdx} className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 relative group shadow-sm">
                        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleRemoveStaged(chunkIdx, qIdx)} className="p-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="font-bold text-gray-900 text-sm pr-10 whitespace-pre-wrap">
                          Q. {q.question?.replace(/\\n/g, '\n')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {options.map((opt, oIdx) => {
                            const optLetter = String.fromCharCode(65 + oIdx);
                            const safeOpt = opt || "";
                            const safeAns = q.answer || "";
                            const isCorrect = 
                              String(safeOpt).trim() === String(safeAns).trim() || 
                              String(safeOpt).trim().toLowerCase() === String(safeAns).trim().toLowerCase() ||
                              optLetter.toLowerCase() === String(safeAns).trim().toLowerCase() ||
                              String(safeAns).trim().toUpperCase() === optLetter;
                            return (
                            <div 
                              key={oIdx} 
                              className={`p-2.5 rounded-lg border ${
                                isCorrect 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="font-bold mr-2">{optLetter}.</span>
                              <span className="whitespace-pre-wrap">{opt?.replace(/\\n/g, '\n')}</span>
                            </div>
                          )})}
                        </div>
                        {q.explanation && (
                          <p className="text-gray-500 italic pt-2 border-t border-gray-100 text-xs whitespace-pre-wrap">
                            <strong>Explanation:</strong> {q.explanation?.replace(/\\n/g, '\n')}
                          </p>
                        )}
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {options.map((opt, oIdx) => {
                      const optLetter = String.fromCharCode(65 + oIdx);
                      const safeOpt = opt || "";
                      const safeAns = q.answer || "";
                      const isCorrect = 
                        String(safeOpt).trim() === String(safeAns).trim() || 
                        String(safeOpt).trim().toLowerCase() === String(safeAns).trim().toLowerCase() ||
                        optLetter.toLowerCase() === String(safeAns).trim().toLowerCase() ||
                        String(safeAns).trim().toUpperCase() === optLetter;
                      return (
                      <div 
                        key={oIdx} 
                        className={`p-2.5 rounded-lg border ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="font-bold mr-2">{optLetter}.</span>
                        {opt}
                      </div>
                    )})}
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

      {/* Link to Course Modal */}
      {linkModalGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLinkModalGroup(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">Link to Course</h2>
              <button onClick={() => setLinkModalGroup(null)} className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs text-indigo-800 font-medium">Linking Test Series:</p>
              <p className="text-sm font-bold text-indigo-900">{linkModalGroup.category} &gt; {linkModalGroup.subcategory}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {courses.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8 italic">No courses found. Create one in the app first.</p>
              ) : (
                courses.map(course => {
                  const isLinked = (course.linked_tests || []).some(l => l.category === linkModalGroup.category && l.subcategory === linkModalGroup.subcategory);
                  return (
                    <div key={course.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isLinked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{course.title}</h4>
                        <p className="text-xs text-gray-500 truncate">{course.description || "No description"}</p>
                      </div>
                      <button
                        onClick={() => handleToggleLink(course, linkModalGroup)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                          isLinked 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isLinked ? 'Remove' : 'Add to Course'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
