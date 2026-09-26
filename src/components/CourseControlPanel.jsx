import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserManager } from '../utils/UserManager';
import { Shield, Search, UserMinus, UserPlus, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CourseControlPanel() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newUser, setNewUser] = useState('');
  
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
      
      // Try to fetch known users from existing enrollments
      const { data: allEnrollments } = await supabase
        .from('prepbuddy_enrollments')
        .select('user_id');
      if (allEnrollments) {
        const uniqueUsers = [...new Set(allEnrollments.map(e => e.user_id))];
        setKnownUsers(uniqueUsers);
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
      setEnrollments(data || []);
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
    
    // Check if already enrolled
    if (enrollments.some(en => en.user_id === newUser.trim())) {
      alert("User is already enrolled in this course.");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('prepbuddy_enrollments')
        .insert([{ user_id: newUser.trim(), course_id: selectedCourse.id }])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEnrollments([data[0], ...enrollments]);
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
              <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-lg text-gray-900">{selectedCourse.title}</h2>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">{enrollments.length} Enrolled Users</p>
                </div>
                <button onClick={() => loadEnrollments(selectedCourse.id)} className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-indigo-50 transition-colors">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Add User Form */}
              <div className="p-4 bg-white border-b border-gray-200">
                <form onSubmit={handleEnroll} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={newUser}
                      onChange={(e) => setNewUser(e.target.value)}
                      placeholder="Enter user_id to re-enroll..."
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

              {/* Enrollment List */}
              <div className="flex-1 overflow-y-auto p-4">
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
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-primary font-bold text-xs border border-indigo-100">
                            {en.user_id.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm font-mono">{en.user_id}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
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
                            <Trash2 size={14} /> De-enroll
                          </button>
                        </div>
                      </div>
                    ))}
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
