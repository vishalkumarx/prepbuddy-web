import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { Shield, Search, UserPlus, Trash2, ArrowLeft, RefreshCw, Layers, Tag, Settings, FileText, Languages, Award, Newspaper, Plus, Clock, X, Edit2, Star } from 'lucide-react';
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
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Test Tiles</h3>
                        {linkedTests.length > 0 && (
                          <button
                            onClick={handleRemoveAllTiles}
                            disabled={actionLoading}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 size={14} /> Remove All Contents
                          </button>
                        )}
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
                                  className={`flex flex-col items-center justify-center gap-2 text-center border p-3 rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] h-full transition-all ${
                                    isExpanded
                                      ? `${color.bg} ${color.border} shadow-sm ring-1 ring-black/5`
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
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
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
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
                                            <span className="text-gray-400 text-xs">
                                              {isSubExpanded ? '▼' : '▶'}
                                            </span>
                                          </div>
                                          
                                          {isSubExpanded && (
                                            <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                                              {groupTests.map((t) => (
                                      <div key={t._idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                        <div className={`p-2 rounded-xl flex-shrink-0 ${t.coming_soon ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                          {t.coming_soon ? <Clock size={16} /> : <FileText size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-900 leading-snug">{t.subcategory}</p>
                                            {t.coming_soon && (
                                              <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Soon</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{t.totalQuestions} Qs • {t.duration} min</p>
                                        </div>
                                        <div className="flex items-center gap-1">

                                          <button
                                            onClick={() => handleDeleteTile(t._idx)}
                                            disabled={actionLoading}
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
