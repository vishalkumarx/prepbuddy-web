import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { Shield, Search, UserPlus, Trash2, ArrowLeft, RefreshCw, Layers, Tag, Settings, FileText, Languages, Award, Newspaper, Plus, Clock, X, Edit2, Star, Eye, EyeOff, Lock, Unlock, Flag, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CouponManager from './CouponManager';

const getMonthWeight = (name) => {
  const lowerName = name.toLowerCase();
  let year = 2024;
  const yearMatch = name.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }
  const monthOrder = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  let monthVal = 0;
  for (const [month, weight] of Object.entries(monthOrder)) {
    if (lowerName.includes(month)) {
      monthVal = weight;
      break;
    }
  }
  if (monthVal === 0) return 999999;
  return (year * 100) + monthVal;
};

export default function CourseControlPanel() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [activeTab, setActiveTab] = useState('enrollments');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [flaggedReports, setFlaggedReports] = useState([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  const fetchFlaggedReports = async () => {
    setFlagsLoading(true);
    try {
      let reports = [];

      // 1. Try fetching from prepbuddy_question_flags if table exists
      const { data: directData, error: directError } = await supabase
        .from('prepbuddy_question_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (!directError && directData) {
        reports = directData;
      } else {
        // 2. Fetch from prepbuddy_comments system reports
        const { data: commentsData } = await supabase
          .from('prepbuddy_comments')
          .select('*')
          .eq('post_id', '7aced78e-9d9b-4015-b1b1-7f31bffd74ca')
          .order('created_at', { ascending: false });

        if (commentsData) {
          commentsData.forEach(c => {
            try {
              const parsed = JSON.parse(c.content);
              if (parsed && (parsed.type === 'flag_question' || parsed.reason)) {
                reports.push({
                  id: c.id,
                  question_id: parsed.question_id,
                  question_number: parsed.question_number,
                  question_text: parsed.question_text,
                  category: parsed.category,
                  subcategory: parsed.subcategory,
                  reason: parsed.reason,
                  details: parsed.details,
                  user_id: parsed.user_id,
                  username: parsed.user_name || c.username,
                  created_at: parsed.timestamp || c.created_at
                });
              }
            } catch (e) {
              // not json flag
            }
          });
        }
      }

      // Also merge any local flags
      try {
        const local = JSON.parse(localStorage.getItem('prepbuddy_reported_flags') || '[]');
        const existingIds = new Set(reports.map(r => r.id || `${r.question_id}_${r.created_at}`));
        local.forEach(l => {
          const key = `${l.question_id}_${l.timestamp}`;
          if (!existingIds.has(key)) {
            reports.push({
              id: key,
              ...l,
              created_at: l.timestamp || new Date(l.reported_at).toISOString()
            });
          }
        });
      } catch (e) {}

      setFlaggedReports(reports);
    } catch (err) {
      console.error("Error fetching flagged reports:", err);
    } finally {
      setFlagsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'flags') {
      fetchFlaggedReports();
    }
  }, [activeTab]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => prev[cat] ? {} : { [cat]: true });
  };

  const [expandedSubgroups, setExpandedSubgroups] = useState({});
  const toggleSubgroup = (cat, subGroupName) => {
    setExpandedSubgroups(prev => ({
      ...prev,
      [`${cat}::${subGroupName}`]: !prev[`${cat}::${subGroupName}`]
    }));
  };

  // Add Coming Soon Test Modal State
  const [showAddComingSoonModal, setShowAddComingSoonModal] = useState(false);
  const [comingSoonCat, setComingSoonCat] = useState('');
  const [comingSoonSubcat, setComingSoonSubcat] = useState('');
  const [comingSoonQuestions, setComingSoonQuestions] = useState('');
  const [comingSoonDuration, setComingSoonDuration] = useState('');

  const handleAddComingSoonTile = async (e) => {
    e.preventDefault();
    if (!comingSoonCat.trim() || !comingSoonSubcat.trim()) {
      alert('Please enter both category and test title');
      return;
    }

    setActionLoading(true);
    try {
      const parsedQuestions = comingSoonQuestions.trim() ? parseInt(comingSoonQuestions.trim(), 10) : null;
      const parsedDuration = comingSoonDuration.trim() ? parseInt(comingSoonDuration.trim(), 10) : null;

      const newTile = {
        category: comingSoonCat.trim(),
        subcategory: comingSoonSubcat.trim(),
        totalQuestions: parsedQuestions,
        duration: parsedDuration,
        time_limit: parsedDuration,
        coming_soon: true,
        is_free: false,
        is_unavailable: false,
        is_hidden: false
      };

      const updated = [...(selectedCourse.linked_tests || []), newTile];
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();

      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
      setShowAddComingSoonModal(false);
      setComingSoonSubcat('');
    } catch (err) {
      alert('Error adding coming soon test: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTile = async (tileIdx) => {
    if (!window.confirm('Remove this test tile?')) return;
    setActionLoading(true);
    try {
      const updated = (selectedCourse.linked_tests || []).filter((_, i) => i !== tileIdx);
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
    } catch (err) {
      alert('Error removing tile: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Are you sure you want to remove the entire "${category}" tile and all its tests from this course?`)) return;
    setActionLoading(true);
    try {
      const updated = (selectedCourse.linked_tests || []).filter(t => t.category !== category);
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
      
      if (expandedCategories[category]) {
        toggleCategory(category);
      }
    } catch (err) {
      alert('Error removing category tile: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubcategory = async (cat, subGroupName, groupTests) => {
    if (!window.confirm(`Are you sure you want to remove the entire "${subGroupName}" subcategory and all its tests from this course?`)) return;
    setActionLoading(true);
    try {
      const idxsToRemove = new Set(groupTests.map(t => t._idx));
      const updated = (selectedCourse.linked_tests || []).filter((_, i) => !idxsToRemove.has(i));
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
    } catch (err) {
      alert('Error removing subcategory: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAllTiles = async () => {
    if (!window.confirm('Are you sure you want to remove all tests from this course? This will NOT delete the original tests from the database, but will delink them from this course.')) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: [] })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
    } catch (err) {
      alert('Error removing tiles: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTile = async (tileIdx, updates) => {
    setActionLoading(true);
    try {
      const updated = [...(selectedCourse.linked_tests || [])];
      updated[tileIdx] = { ...updated[tileIdx], ...updates };
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
    } catch (err) {
      alert('Error updating tile: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };
  
  // All known users (from sessions or enrollments) to help autocomplete
  const [knownUsers, setKnownUsers] = useState([]);

  useEffect(() => {
    if (!UserManager.isAdmin()) {
      navigate('/');
      return;
    }
    fetchInitialData();
  }, [navigate]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: coursesData } = await supabase
        .from('prepbuddy_test_series')
        .select('*')
        .order('created_at', { ascending: false });
        
      setCourses(coursesData || []);
      
      // Fetch known users from sessions for autocomplete
      const { data: allUsers } = await supabase
        .from('prepbuddy_user_sessions')
        .select('email');
      if (allUsers) {
        const uniqueEmails = [...new Set(allUsers.map(e => e.email))].filter(Boolean);
        setKnownUsers(uniqueEmails);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async (courseId) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('prepbuddy_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
        
      if (data && data.length > 0) {
        const userIds = data.map(e => e.user_id);
        const { data: sessionsData } = await supabase
          .from('prepbuddy_user_sessions')
          .select('user_id, email, name')
          .in('user_id', userIds);
          
        const sessionMap = {};
        if (sessionsData) {
          sessionsData.forEach(s => sessionMap[s.user_id] = s);
        }
        
        const enriched = data.map(e => ({
          ...e,
          email: sessionMap[e.user_id]?.email || e.user_id,
          name: sessionMap[e.user_id]?.name || 'Unknown'
        }));
        setEnrollments(enriched);
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    loadEnrollments(course.id);
  };

  const handleDeEnroll = async (enrollmentId) => {
    if (!window.confirm("Are you sure you want to de-enroll this user? They will lose access to the course.")) return;
    setActionLoading(true);
    try {
      await supabase.from('prepbuddy_enrollments').delete().eq('id', enrollmentId);
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    } catch (err) {
      alert("Error de-enrolling user: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!newUser.trim() || !selectedCourse) return;
    
    setActionLoading(true);
    
    const targetEmail = newUser.trim().toLowerCase();
    
    try {
      // Find user_id by email
      const { data: sessionData, error: sessionError } = await supabase
        .from('prepbuddy_user_sessions')
        .select('user_id, email, name')
        .eq('email', targetEmail)
        .maybeSingle();
        
      if (sessionError || !sessionData) {
         alert("User email not found. The user must log into the app at least once before they can be enrolled.");
         setActionLoading(false);
         return;
      }
      
      const targetUserId = sessionData.user_id;

      // Check if already enrolled
      if (enrollments.some(en => en.user_id === targetUserId)) {
        alert("User is already enrolled in this course.");
        setActionLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: targetUserId, course_id: selectedCourse.id }])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEnrollments([{
          ...data[0],
          email: sessionData.email,
          name: sessionData.name
        }, ...enrollments]);
      }
      setNewUser('');
    } catch (err) {
      alert("Error enrolling user: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!UserManager.isAdmin()) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center shadow-sm border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <Shield className="ml-2 text-primary mr-2" size={20} />
        <h1 className="text-xl font-bold text-[#0B2457] flex-1">Test Series Control Panel</h1>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left sidebar: Course List */}
        <div className="w-full md:w-1/3 bg-white border-r border-gray-200 flex flex-col h-1/3 md:h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Select a Test Series</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {courses.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleCourseSelect(c)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedCourse?.id === c.id ? 'bg-indigo-50 border-l-4 border-l-primary' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <h3 className={`font-bold text-sm ${selectedCourse?.id === c.id ? 'text-primary' : 'text-gray-800'}`}>{c.title}</h3>
                <p className="text-xs text-gray-500 mt-1">₹{c.price > 0 ? c.price : 'Free'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: Enrollments */}
        <div className="w-full md:w-2/3 flex flex-col h-2/3 md:h-full bg-gray-50">
          {!selectedCourse ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <Shield size={48} className="mb-4 opacity-20" />
              <p>Select a test series from the list to manage its enrollments.</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-lg text-gray-900">{selectedCourse.title}</h2>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">{enrollments.length} Enrolled Users</p>
                  </div>
                  <button onClick={() => loadEnrollments(selectedCourse.id)} className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-indigo-50 transition-colors">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                <div className="flex space-x-4 border-b border-gray-100 overflow-x-auto custom-scrollbar pb-1">
                  <button onClick={() => setActiveTab('enrollments')} className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'enrollments' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <UserPlus size={16} className="inline mr-1" /> Enrollments
                  </button>
                  <button onClick={() => setActiveTab('contents')} className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'contents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Layers size={16} className="inline mr-1" /> Contents
                  </button>
                  <button onClick={() => setActiveTab('coupons')} className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'coupons' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Tag size={16} className="inline mr-1" /> Promo Codes
                  </button>
                  <button onClick={() => setActiveTab('settings')} className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Settings size={16} className="inline mr-1" /> Settings
                  </button>
                  <button onClick={() => setActiveTab('flags')} className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'flags' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Flag size={16} className="inline mr-1" /> Flagged Questions
                    {flaggedReports.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700 font-black">
                        {flaggedReports.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                
                {/* ENROLLMENTS TAB */}
                {activeTab === 'enrollments' && (
                  <>
                    <div className="p-4 bg-white border-b border-gray-200">
                      <form onSubmit={handleEnroll} className="flex gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={newUser}
                            onChange={(e) => setNewUser(e.target.value)}
                            placeholder="Enter user's gmail id to enroll..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            list="known-users"
                          />
                          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                          <datalist id="known-users">
                            {knownUsers.map(u => <option key={u} value={u} />)}
                          </datalist>
                        </div>
                        <button 
                          type="submit"
                          disabled={actionLoading || !newUser.trim()}
                          className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                        >
                          <UserPlus size={16} /> Enroll
                        </button>
                      </form>
                    </div>

                    <div className="p-4">
                      {loading ? (
                        <div className="flex justify-center p-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : enrollments.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 border-dashed">
                          <p className="text-gray-500 font-medium text-sm">No users are enrolled in this test series.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {enrollments.map(en => (
                            <div key={en.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-primary font-bold text-xs border border-indigo-100 uppercase">
                                  {en.email ? en.email.substring(0, 2) : en.user_id.substring(0, 2)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{en.name}</p>
                                  <p className="text-xs text-gray-500 font-mono">{en.email}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                    Enrolled: {new Date(en.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleDeEnroll(en.id)}
                                  disabled={actionLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* CONTENTS TAB */}
                {activeTab === 'contents' && (() => {
                  const linkedTests = selectedCourse.linked_tests || [];
                  const grouped = linkedTests.reduce((acc, t, i) => {
                    if (!acc[t.category]) acc[t.category] = [];
                    acc[t.category].push({ ...t, _idx: i });
                    return acc;
                  }, {});
                  const colors = [
                    { bg: 'bg-blue-50/70', border: 'border-blue-100/70', iconBg: 'bg-[#0B2457]', icon: Layers },
                    { bg: 'bg-amber-50/70', border: 'border-amber-100/70', iconBg: 'bg-amber-500', icon: Languages },
                    { bg: 'bg-purple-50/70', border: 'border-purple-100/70', iconBg: 'bg-purple-600', icon: Newspaper },
                    { bg: 'bg-emerald-50/70', border: 'border-emerald-100/70', iconBg: 'bg-emerald-600', icon: Award },
                  ];
                  return (
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">Test Tiles</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Pre-fill first category if available
                              const existingCategories = Object.keys(grouped);
                              if (existingCategories.length > 0 && !comingSoonCat) {
                                setComingSoonCat(existingCategories[0]);
                              }
                              setShowAddComingSoonModal(true);
                            }}
                            className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Clock size={14} className="text-amber-600" /> + Add Coming Soon Test
                          </button>
                          {linkedTests.length > 0 && (
                            <button
                              onClick={handleRemoveAllTiles}
                              disabled={actionLoading}
                              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 size={14} /> Remove All
                            </button>
                          )}
                        </div>
                      </div>

                      {linkedTests.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">No tests yet. Add your first tile above!</p>
                      ) : (
                        <>
                          {/* Category Tiles */}
                          <div className="grid grid-cols-3 gap-3 mb-6">
                            {Object.entries(grouped).map(([category, tests], idx) => {
                              const color = colors[idx % colors.length];
                              const Icon = color.icon;
                              const isExpanded = expandedCategories[category];
                              return (
                                <div
                                  key={category}
                                  onClick={() => toggleCategory(category)}
                                  className={`flex flex-col items-center justify-center gap-2 text-center border p-3 rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] h-full transition-all relative group ${
                                    isExpanded
                                      ? `${color.bg} ${color.border} shadow-sm ring-1 ring-black/5`
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCategory(category);
                                    }}
                                    disabled={actionLoading}
                                    className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Remove this category and all its tests"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div className={`p-2 rounded-xl ${isExpanded ? color.iconBg : 'bg-gray-200'} ${isExpanded ? 'text-white' : 'text-gray-400'} shadow-sm transition-colors`}>
                                    <Icon size={18} />
                                  </div>
                                  <div className="flex flex-col gap-1 items-center justify-center h-full">
                                    <div className={`font-bold text-sm leading-tight line-clamp-2 ${isExpanded ? 'text-gray-900' : 'text-gray-700'}`}>{category}</div>
                                    <div className={`text-xs font-medium ${isExpanded ? 'text-gray-500' : 'text-gray-400'}`}>{tests.length} {tests.length === 1 ? 'Test' : 'Tests'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expanded Test List with Delete */}
                          <div className="space-y-6">
                            {Object.entries(grouped).map(([cat, tests]) => {
                              if (!expandedCategories[cat]) return null;
                              
                              const subGroups = tests.reduce((acc, test) => {
                                const subGroupName = test.subcategory.includes('-') 
                                  ? test.subcategory.split('-')[0].trim() 
                                  : test.subcategory;
                                if (!acc[subGroupName]) acc[subGroupName] = [];
                                acc[subGroupName].push(test);
                                return acc;
                              }, {});

                              return (
                                <div key={cat} className="space-y-4">
                                  <h3 className="font-bold text-gray-900 pl-1">{cat} Topics</h3>
                                  <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(subGroups).sort((a, b) => getMonthWeight(a[0]) - getMonthWeight(b[0])).map(([subGroupName, groupTests]) => {
                                      const isSubExpanded = expandedSubgroups[`${cat}::${subGroupName}`];
                                      return (
                                        <div key={subGroupName} className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                                          <div 
                                            onClick={() => toggleSubgroup(cat, subGroupName)}
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group/sub"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                                                <Layers size={18} />
                                              </div>
                                              <div>
                                                <h4 className="font-bold text-gray-900">{subGroupName}</h4>
                                                <p className="text-xs font-medium text-gray-500">{groupTests.length} {groupTests.length === 1 ? 'Test' : 'Tests'}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteSubcategory(cat, subGroupName, groupTests);
                                                }}
                                                disabled={actionLoading}
                                                className="p-1.5 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                                title="Remove this subcategory and all its tests"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                              <span className="text-gray-400 text-xs">
                                                {isSubExpanded ? '▼' : '▶'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {isSubExpanded && (
                                            <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                                              {groupTests.map((t) => (
                                      <div key={t._idx} className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 ${t.is_hidden ? 'opacity-60' : ''}`}>
                                        <div className={`p-2 rounded-xl flex-shrink-0 ${t.coming_soon ? 'bg-amber-50 text-amber-500' : (t.is_unavailable ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600')}`}>
                                          {t.coming_soon ? <Clock size={16} /> : (t.is_unavailable ? <Lock size={16} /> : <FileText size={16} />)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className={`font-bold text-sm text-gray-900 leading-snug ${t.is_hidden ? 'line-through text-gray-500' : ''}`}>{t.subcategory}</p>
                                            {t.is_free && (
                                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Free</span>
                                            )}
                                            {t.coming_soon && (
                                              <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Soon</span>
                                            )}
                                            {t.is_unavailable && (
                                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Unavailable</span>
                                            )}
                                            {t.is_hidden && (
                                              <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Hidden</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{t.totalQuestions} Qs • {t.duration} min</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleUpdateTile(t._idx, { coming_soon: !t.coming_soon })}
                                            disabled={actionLoading}
                                            title={t.coming_soon ? "Mark as Released" : "Mark as Coming Soon"}
                                            className={`p-1.5 rounded-lg transition-colors font-bold text-[10px] px-2 ${t.coming_soon ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                          >
                                            {t.coming_soon ? "SOON" : "Soon?"}
                                          </button>
                                          <button
                                            onClick={() => handleUpdateTile(t._idx, { is_free: !t.is_free })}
                                            disabled={actionLoading}
                                            title={t.is_free ? "Mark as Paid" : "Mark as Free Test"}
                                            className={`p-1.5 rounded-lg transition-colors font-bold text-[10px] px-2 ${t.is_free ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                          >
                                            {t.is_free ? "FREE" : "Free?"}
                                          </button>
                                          <button
                                            onClick={() => handleUpdateTile(t._idx, { is_unavailable: !t.is_unavailable })}
                                            disabled={actionLoading}
                                            title={t.is_unavailable ? "Mark as Available" : "Mark as Unavailable"}
                                            className={`p-1.5 rounded-lg transition-colors ${t.is_unavailable ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
                                          >
                                            {t.is_unavailable ? <Lock size={14} /> : <Unlock size={14} />}
                                          </button>
                                          <button
                                            onClick={() => handleUpdateTile(t._idx, { is_hidden: !t.is_hidden })}
                                            disabled={actionLoading}
                                            title={t.is_hidden ? "Show Tile" : "Hide Tile"}
                                            className={`p-1.5 rounded-lg transition-colors ${t.is_hidden ? 'text-gray-600 bg-gray-200 hover:bg-gray-300' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                          >
                                            {t.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTile(t._idx)}
                                            disabled={actionLoading}
                                            title="Remove Tile"
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                      {/* Add Coming Soon Test Modal */}
                      {showAddComingSoonModal && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => setShowAddComingSoonModal(false)}
                              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 absolute top-4 right-4 transition-colors"
                            >
                              <X size={20} />
                            </button>

                            <div className="flex items-center gap-2.5 mb-4">
                              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
                                <Clock size={22} />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-gray-900 leading-tight">Add Coming Soon Test</h3>
                                <p className="text-xs text-gray-500">Add an upcoming test tile to this course.</p>
                              </div>
                            </div>

                            <form onSubmit={handleAddComingSoonTile} className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Category / Subject
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={comingSoonCat}
                                  onChange={e => setComingSoonCat(e.target.value)}
                                  placeholder="e.g. Mock Tests, Punjab GK, English"
                                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                                />
                                {Object.keys(grouped).length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span className="text-[11px] text-gray-400">Existing:</span>
                                    {Object.keys(grouped).map(cat => (
                                      <button
                                        type="button"
                                        key={cat}
                                        onClick={() => setComingSoonCat(cat)}
                                        className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md transition-colors"
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Test Name / Subcategory
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={comingSoonSubcat}
                                  onChange={e => setComingSoonSubcat(e.target.value)}
                                  placeholder="e.g. Full Length Mock Test 05"
                                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Est. Questions <span className="text-gray-400 font-normal lowercase">(optional)</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={comingSoonQuestions}
                                    onChange={e => setComingSoonQuestions(e.target.value)}
                                    placeholder="e.g. 100"
                                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Duration (Mins) <span className="text-gray-400 font-normal lowercase">(optional)</span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={comingSoonDuration}
                                    onChange={e => setComingSoonDuration(e.target.value)}
                                    placeholder="e.g. 120"
                                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddComingSoonModal(false)}
                                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={actionLoading}
                                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Clock size={15} /> Add Coming Soon Test
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* PROMO CODES TAB */}
                {activeTab === 'coupons' && (
                  <div className="p-4">
                    <CouponManager resourceId={selectedCourse.id} />
                  </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-6 text-lg">Test Series Settings</h3>
                    
                    <CourseDetailsEditor 
                      course={selectedCourse} 
                      onUpdate={(updated) => {
                        setSelectedCourse({...selectedCourse, ...updated});
                        setCourses(courses.map(c => c.id === selectedCourse.id ? {...c, ...updated} : c));
                      }} 
                    />

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm max-w-xl mb-6">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" /> Course Status
                      </h4>
                      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Tagging a course as "Coming Soon" will show an animated banner on the course tile.
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedCourse.is_coming_soon || false}
                          onChange={async (e) => {
                            const val = e.target.checked;
                            try {
                               const { error } = await supabase.from('prepbuddy_test_series').update({ is_coming_soon: val }).eq('id', selectedCourse.id);
                               if(error) {
                                  if(error.message.includes('column "is_coming_soon" of relation "prepbuddy_test_series" does not exist')) {
                                      alert("Please run this SQL in Supabase: alter table public.prepbuddy_test_series add column is_coming_soon boolean default false;");
                                  } else {
                                      throw error;
                                  }
                               } else {
                                  setSelectedCourse({...selectedCourse, is_coming_soon: val});
                                  setCourses(courses.map(c => c.id === selectedCourse.id ? {...c, is_coming_soon: val} : c));
                               }
                            } catch(err) {
                               alert(err.message);
                            }
                          }}
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 border-gray-300"
                        />
                        <span className="font-bold text-sm text-gray-800">Mark as "Coming Soon"</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer mt-4">
                        <input 
                          type="checkbox" 
                          checked={selectedCourse.is_popular || false}
                          onChange={async (e) => {
                            const val = e.target.checked;
                            try {
                               const { error } = await supabase.from('prepbuddy_test_series').update({ is_popular: val }).eq('id', selectedCourse.id);
                               if(error) {
                                  if(error.message.includes('column "is_popular" of relation "prepbuddy_test_series" does not exist')) {
                                      alert("Please run this SQL in Supabase: alter table public.prepbuddy_test_series add column is_popular boolean default false;");
                                  } else {
                                      throw error;
                                  }
                               } else {
                                  setSelectedCourse({...selectedCourse, is_popular: val});
                                  setCourses(courses.map(c => c.id === selectedCourse.id ? {...c, is_popular: val} : c));
                               }
                            } catch(err) {
                               alert(err.message);
                            }
                          }}
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 border-gray-300"
                        />
                        <span className="font-bold text-sm text-gray-800">Mark as "Popular Test Series"</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer mt-4">
                        <input 
                          type="checkbox" 
                          checked={Number(selectedCourse.price) === 0}
                          onChange={async (e) => {
                            const isFree = e.target.checked;
                            const newPrice = isFree ? 0 : 499;
                            try {
                               const { error } = await supabase.from('prepbuddy_test_series').update({ price: newPrice }).eq('id', selectedCourse.id);
                               if(error) throw error;
                               setSelectedCourse({...selectedCourse, price: newPrice});
                               setCourses(courses.map(c => c.id === selectedCourse.id ? {...c, price: newPrice} : c));
                            } catch(err) {
                               alert(err.message);
                            }
                          }}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 bg-gray-100 border-gray-300"
                        />
                        <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                          Mark as "Free Test Series"
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Free Tag</span>
                        </span>
                      </label>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm max-w-xl">
                      <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                        <Trash2 size={18} /> Danger Zone
                      </h4>
                      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Once you delete a course, there is no going back. All enrollments and associated test data will be permanently removed. Please be certain.
                      </p>
                      <button 
                        onClick={async () => {
                          if(window.confirm(`Are you sure you want to completely DELETE "${selectedCourse.title}"?`)) {
                            try {
                               await supabase.from('prepbuddy_test_series').delete().eq('id', selectedCourse.id);
                               setCourses(courses.filter(c => c.id !== selectedCourse.id));
                               setSelectedCourse(null);
                            } catch(e) {
                               alert(e.message);
                            }
                          }
                        }}
                        className="bg-red-50 text-red-600 font-bold px-5 py-2.5 rounded-xl text-sm border border-red-100 hover:bg-red-100 transition-colors w-full sm:w-auto"
                      >
                        Delete Course
                      </button>
                    </div>
                  </div>
                )}

                {/* FLAGGED QUESTIONS TAB */}
                {activeTab === 'flags' && (
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                      <div>
                        <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                          <Flag size={18} className="text-rose-600" />
                          User Flagged Questions
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Questions flagged by students during test attempts or while viewing solutions
                        </p>
                      </div>
                      <button
                        onClick={fetchFlaggedReports}
                        disabled={flagsLoading}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw size={13} className={flagsLoading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {flagsLoading ? (
                      <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                      </div>
                    ) : flaggedReports.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <Flag size={40} className="mx-auto text-gray-300 mb-2" />
                        <h4 className="font-bold text-sm text-gray-700">No Flagged Questions</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                          When users encounter an issue or report a question error, their reports with details will appear here for verification.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {flaggedReports.map((report, idx) => (
                          <div key={report.id || idx} className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                                  {report.reason || 'Flagged'}
                                </span>
                                {report.question_number && (
                                  <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                    Q#{report.question_number}
                                  </span>
                                )}
                                {(report.category || report.subcategory) && (
                                  <span className="text-[11px] font-medium text-gray-500">
                                    {report.subcategory} • {report.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 shrink-0">
                                {report.created_at ? new Date(report.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>

                            {/* Question snippet */}
                            {report.question_text && (
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-800 font-medium">
                                <span className="text-gray-400 font-bold mr-1">Q:</span>
                                <span dangerouslySetInnerHTML={{ __html: report.question_text }} />
                              </div>
                            )}

                            {/* Details from user */}
                            {report.details ? (
                              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100/80">
                                <div className="text-[11px] font-bold text-rose-900 mb-0.5">User Feedback / Correction:</div>
                                <p className="text-xs text-rose-800 leading-relaxed font-medium">{report.details}</p>
                              </div>
                            ) : (
                              <p className="text-xs italic text-gray-400">No additional details provided by user.</p>
                            )}

                            {/* Reporter Info */}
                            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                              <span>Reported by: <strong className="text-gray-600">{report.username || 'Student'}</strong></span>
                              {report.question_id && (
                                <span className="font-mono text-[10px]">ID: {report.question_id.slice(0, 8)}...</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseDetailsEditor({ course, onUpdate }) {
  const [title, setTitle] = React.useState(course.title || '');
  const [description, setDescription] = React.useState(course.description || '');
  const [price, setPrice] = React.useState(course.price ?? 0);
  const [mrp, setMrp] = React.useState(course.mrp ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setTitle(course.title || '');
    setDescription(course.description || '');
    setPrice(course.price ?? 0);
    setMrp(course.mrp ?? '');
  }, [course.id]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ title: title.trim(), description: description.trim(), price: Number(price), mrp: mrp !== '' ? Number(mrp) : null })
        .eq('id', course.id)
        .select()
        .single();
      if (error) throw error;
      onUpdate(data);
      alert('Course details updated!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm max-w-xl mb-6">
      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Edit2 size={18} className="text-indigo-500" /> Basic Details
      </h4>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Test Series Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Course title..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Short description..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Selling Price (₹)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">MRP / Original Price (₹)</label>
            <input
              type="number"
              min="0"
              value={mrp}
              onChange={e => setMrp(e.target.value)}
              placeholder="Leave blank if no discount"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
