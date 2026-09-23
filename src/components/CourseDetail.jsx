import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, IndianRupee, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Course not found.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">
          Go Back
        </button>
      </div>
    );
  }

  const linkedTests = course.linked_tests || [];
  
  // Group tests by category
  const grouped = linkedTests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[100dvh] bg-app-bg pb-[80px] overflow-y-auto">
      {/* Top Banner & Nav */}
      <div className="relative w-full h-64 bg-gray-100 flex-shrink-0">
        {course.banner_url ? (
          <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
            <span className="text-white/20 font-bold text-4xl uppercase px-4 text-center">{course.title}</span>
          </div>
        )}
        
        {/* Back Button Gradient Overlay */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors pointer-events-auto"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="px-5 pt-6 pb-8 -mt-6 bg-white rounded-t-3xl relative shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.15)] flex-1">
        
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-black text-[#0B2457] leading-tight flex-1">
            {course.title}
          </h1>
          <div className="bg-[#0B2457] text-white font-bold px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap flex items-center flex-shrink-0">
            {course.price > 0 ? (
              <>
                <IndianRupee size={16} className="mr-0.5" />
                {course.price}
              </>
            ) : (
              'Free'
            )}
          </div>
        </div>

        {/* Description */}
        {course.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {course.description}
          </p>
        )}

        {/* Included Tests Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Included Mock Tests</h2>
          </div>

          {linkedTests.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <p className="text-gray-500 font-medium text-sm">No tests have been added to this course yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, tests]) => (
                <div key={cat} className="space-y-3">
                  <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">{cat}</h3>
                  <div className="space-y-3">
                    {tests.map((test, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer group">
                        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm mb-0.5">{test.subcategory}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 size={14} />
                          Available
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buy/Start Button (Static for now) */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-50">
        <button className="w-full bg-[#0B2457] text-white font-bold py-4 rounded-xl text-base shadow-lg hover:bg-blue-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          {course.price > 0 ? 'Buy Now' : 'Enroll Now for Free'}
        </button>
      </div>
    </div>
  );
}
