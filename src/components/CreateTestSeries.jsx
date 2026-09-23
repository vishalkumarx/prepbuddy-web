import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Plus, Upload, CheckCircle2, ListPlus } from 'lucide-react';

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

  const handleAddQuestion = (e) => {
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

    const newQuestion = {
      question,
      options: [optionA, optionB, optionC, optionD],
      answer: answerText,
      explanation,
      category,
      subcategory
    };

    setQuestionsList([...questionsList, newQuestion]);
    
    // Clear form for next question
    setQuestion('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setAnswer('A');
    setExplanation('');
  };

  const handleUpload = async () => {
    if (questionsList.length === 0) return;
    setIsUploading(true);
    
    try {
      // In case user changed category/subcategory mid-way, ensure all questions have the latest if desired, 
      // but keeping the ones set at time of adding is usually better.
      const { error } = await supabase
        .from('prepbuddy_questions')
        .insert(questionsList);

      if (error) throw error;
      
      alert(`🎉 Successfully uploaded ${questionsList.length} questions to the database!`);
      setQuestionsList([]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload questions: ' + err.message);
    } finally {
      setIsUploading(false);
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
                onChange={(e) => setQuestion(e.target.value)}
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

            <button
              type="submit"
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-indigo-200 mt-2"
            >
              <Plus size={18} />
              Add Question to Test
            </button>
          </form>
        </div>

        {/* Preview & Upload Section */}
        {questionsList.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
              <h3 className="font-bold text-gray-900 text-base">Questions Added: {questionsList.length}</h3>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Test to Database
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {questionsList.map((q, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <p className="font-bold text-gray-900 text-sm">
                    Q{idx + 1}. {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => (
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
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
