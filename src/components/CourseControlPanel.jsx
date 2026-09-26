import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { Shield, Search, UserPlus, Trash2, ArrowLeft, RefreshCw, Layers, Tag, Settings, FileText, Languages, Award, Newspaper, Plus, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CouponManager from './CouponManager';

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
  const [showAddTile, setShowAddTile] = useState(false);
  const [newTile, setNewTile] = useState({ category: '', subcategory: '', totalQuestions: '', duration: '', coming_soon: false });

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ [cat]: !prev[cat] }));

  const handleAddTile = async () => {
    if (!newTile.category.trim() || !newTile.subcategory.trim()) return;
    setActionLoading(true);
    try {
      const existing = selectedCourse.linked_tests || [];
      const updated = [...existing, {
        category: newTile.category.trim(),
        subcategory: newTile.subcategory.trim(),
        totalQuestions: parseInt(newTile.totalQuestions) || 0,
        duration: parseInt(newTile.duration) || 0,
        coming_soon: newTile.coming_soon
      }];
      const { data, error } = await supabase
        .from('prepbuddy_test_series')
        .update({ linked_tests: updated })
        .eq('id', selectedCourse.id)
        .select()
        .single();
      if (error) throw error;
      setSelectedCourse(data);
      setCourses(prev => prev.map(c => c.id === data.id ? data : c));
      setNewTile({ category: '', subcategory: '', totalQuestions: '', duration: '', coming_soon: false });
      setShowAddTile(false);
    } catch (err) {
      alert('Error adding tile: ' + err.message);
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
        <h1 className="text-xl font-bold text-[#0B2457] flex-1">Course Control Panel</h1>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left sidebar: Course List */}
        <div className="w-full md:w-1/3 bg-white border-r border-gray-200 flex flex-col h-1/3 md:h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Select a Course</h2>
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
              <p>Select a course from the list to manage its enrollments.</p>
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
                          <p className="text-gray-500 font-medium text-sm">No users are enrolled in this course.</p>
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
                      {/* Add Tile Button */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Test Tiles</h3>
                        <button
                          onClick={() => setShowAddTile(v => !v)}
                          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-900 transition-colors"
                        >
                          <Plus size={14} /> Add Tile
                        </button>
                      </div>

                      {/* Add Tile Form */}
                      {showAddTile && (
                        <div className="mb-5 bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-3">
                          <p className="font-bold text-sm text-gray-700">New Test Tile</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={newTile.category}
                              onChange={e => setNewTile(v => ({ ...v, category: e.target.value }))}
                              placeholder="Category (e.g. Mock Test)"
                              className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                              value={newTile.subcategory}
                              onChange={e => setNewTile(v => ({ ...v, subcategory: e.target.value }))}
                              placeholder="Subcategory / Test Name"
                              className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="number"
                              value={newTile.totalQuestions}
                              onChange={e => setNewTile(v => ({ ...v, totalQuestions: e.target.value }))}
                              placeholder="Questions"
                              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="number"
                              value={newTile.duration}
                              onChange={e => setNewTile(v => ({ ...v, duration: e.target.value }))}
                              placeholder="Duration (min)"
                              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600">
                            <input
                              type="checkbox"
                              checked={newTile.coming_soon}
                              onChange={e => setNewTile(v => ({ ...v, coming_soon: e.target.checked }))}
                              className="rounded accent-primary"
                            />
                            Mark as "Coming Soon"
                          </label>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setShowAddTile(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Cancel</button>
                            <button onClick={handleAddTile} disabled={actionLoading || !newTile.category.trim() || !newTile.subcategory.trim()} className="flex-[2] py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
                              {actionLoading ? 'Saving...' : 'Save Tile'}
                            </button>
                          </div>
                        </div>
                      )}

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
                                  className={`flex flex-col items-center justify-center gap-2 text-center border p-3 rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all ${
                                    isExpanded
                                      ? `${color.bg} ${color.border} shadow-sm ring-1 ring-black/5`
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`p-2 rounded-xl ${isExpanded ? color.iconBg : 'bg-gray-200'} ${isExpanded ? 'text-white' : 'text-gray-400'} shadow-sm transition-colors`}>
                                    <Icon size={18} />
                                  </div>
                                  <div>
                                    <div className={`font-black text-xl leading-none ${isExpanded ? 'text-gray-900' : 'text-gray-400'}`}>{tests.length}</div>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 leading-tight line-clamp-2 ${isExpanded ? 'text-gray-700' : 'text-gray-400'}`}>{category}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expanded Test List with Delete */}
                          <div className="space-y-6">
                            {Object.entries(grouped).map(([cat, tests]) =>
                              expandedCategories[cat] && (
                                <div key={cat} className="space-y-3">
                                  <h3 className="font-bold text-gray-900 pl-1">{cat} Tests</h3>
                                  <div className="space-y-2">
                                    {tests.map((t) => (
                                      <div key={t._idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                        <div className={`p-2 rounded-xl flex-shrink-0 ${t.coming_soon ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                          {t.coming_soon ? <Clock size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-900 truncate">{t.subcategory}</p>
                                            {t.coming_soon && (
                                              <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Soon</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{t.totalQuestions} Qs • {t.duration} min</p>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteTile(t._idx)}
                                          disabled={actionLoading}
                                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </>
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
                    <h3 className="font-bold text-gray-900 mb-6 text-lg">Course Settings</h3>
                    
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

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
