import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserManager } from '../utils/UserManager';

export default function FreeTestManager() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState({});
  const [freeTests, setFreeTests] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [selectedPrepMode, setSelectedPrepMode] = useState('');
  const [loading, setLoading] = useState(true);

  // The UUID for our internal free test series record, or we just look it up by a unique title.
  const [freeCourseId, setFreeCourseId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all distinct categories and subcategories
      const { data: questions, error: qErr } = await supabase
        .from('prepbuddy_questions')
        .select('category, subcategory');
      
      if (qErr) throw qErr;
      
      const cats = {};
      (questions || []).forEach(q => {
        if (!q.category || !q.subcategory) return;
        if (!cats[q.category]) cats[q.category] = new Set();
        cats[q.category].add(q.subcategory);
      });
      
      const formattedCats = {};
      Object.keys(cats).forEach(c => {
        formattedCats[c] = Array.from(cats[c]).sort();
      });
      setCategories(formattedCats);

      // 2. Fetch the Free Test Series record
      let { data: freeCourse, error: fcErr } = await supabase
        .from('prepbuddy_test_series')
        .select('id, linked_tests')
        .eq('title', 'INTERNAL_FREE_TEST_SECTION')
        .maybeSingle();

      if (fcErr) throw fcErr;

      if (!freeCourse) {
        // Create it
        const { data: newCourse, error: insertErr } = await supabase
          .from('prepbuddy_test_series')
          .insert([{ 
            title: 'INTERNAL_FREE_TEST_SECTION', 
            description: 'Internal record for free tests',
            price: 0,
            linked_tests: []
          }])
          .select()
          .single();
        if (insertErr) throw insertErr;
        freeCourse = newCourse;
      }

      setFreeCourseId(freeCourse.id);
      setFreeTests(freeCourse.linked_tests || []);
      
    } catch (err) {
      console.error(err);
      alert('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFreeTest = async () => {
    if (!selectedCat || !selectedSubCat) {
      alert("Please select both a category and a subcategory");
      return;
    }
    
    // Check if already exists
    if (freeTests.some(t => t.category === selectedCat && t.subcategory === selectedSubCat)) {
      alert("This test is already in the free section!");
      return;
    }
    
    const newTests = [...freeTests, { category: selectedCat, subcategory: selectedSubCat, prep_mode: selectedPrepMode || null }];
    updateFreeTests(newTests);
  };

  const handleRemoveFreeTest = async (idxToRemove) => {
    const newTests = freeTests.filter((_, idx) => idx !== idxToRemove);
    updateFreeTests(newTests);
  };

  const updateFreeTests = async (newTests) => {
    if (!freeCourseId) return;
    try {
      const { error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: newTests })
        .eq('id', freeCourseId);
        
      if (error) throw error;
      setFreeTests(newTests);
      alert("Successfully updated free tests!");
    } catch (err) {
      console.error(err);
      alert("Error updating free tests: " + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="bg-primary flex items-center p-4 shadow-md sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1.5 rounded-full mr-3">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-lg">Free Tests Control Panel</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add a Free Test</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <select 
                value={selectedCat}
                onChange={(e) => {
                  setSelectedCat(e.target.value);
                  setSelectedSubCat('');
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select Category</option>
                {Object.keys(categories).sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subcategory (Test)</label>
              <select 
                value={selectedSubCat}
                onChange={(e) => setSelectedSubCat(e.target.value)}
                disabled={!selectedCat}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">Select Test</option>
                {(categories[selectedCat] || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Exam Tag (Optional)</label>
              <select 
                value={selectedPrepMode}
                onChange={(e) => setSelectedPrepMode(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">No specific tag</option>
                <option value="state_gov">State Govt.</option>
                <option value="central_gov">Central Govt.</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleAddFreeTest}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3 flex justify-center items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add to Free Section
          </button>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">Currently Free Tests ({freeTests.length})</h2>
          
          {freeTests.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
              No tests have been added to the free section yet.
            </div>
          ) : (
            <div className="space-y-3">
              {freeTests.map((t, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{t.subcategory}</h3>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={t.prep_mode || ''}
                      onChange={(e) => {
                        const newTests = [...freeTests];
                        newTests[idx].prep_mode = e.target.value || null;
                        updateFreeTests(newTests);
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="">No tag</option>
                      <option value="state_gov">State Govt.</option>
                      <option value="central_gov">Central Govt.</option>
                    </select>
                    <button 
                      onClick={() => handleRemoveFreeTest(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
