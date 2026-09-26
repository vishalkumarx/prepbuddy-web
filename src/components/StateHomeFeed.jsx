import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { IndianRupee, Layers, Languages, Award, Newspaper, CheckCircle2 } from 'lucide-react';
import TestimonialCarousel from './TestimonialCarousel';
import { UserManager } from '../utils/UserManager';

export default function StateHomeFeed() {
  const navigate = useNavigate();
  const [testSeries, setTestSeries] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_test_series')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTestSeries(data || []);
      } catch (err) {
        console.error('Error fetching test series:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchEnrollments = async () => {
      const userId = UserManager.getUserId();
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('prepbuddy_enrollments')
          .select('course_id')
          .eq('user_id', userId);
        if (data) {
          setEnrolledIds(new Set(data.map(d => d.course_id)));
        }
      } catch (err) {
        console.error('Error fetching enrollments:', err);
      }
    };

    fetchTestSeries();
    fetchEnrollments();

    // Subscribe to new test series
    const channel = supabase
      .channel('test_series_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prepbuddy_test_series' },
        () => {
          fetchTestSeries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Testimonials Carousel */}
      <TestimonialCarousel />

      {/* Section Title */}
      <div className="pt-2 pb-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Popular Courses</h2>
      </div>

      {testSeries.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p>No test series available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testSeries.map((ts) => {
          const showFeatures = ts.title?.toLowerCase().includes('senior') || ts.title?.toLowerCase().includes('assistant') || ts.title?.toLowerCase().includes('asi') || true;

          return (
            <div 
              key={ts.id} 
              onClick={() => navigate(`/course/${ts.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all active:scale-[0.99]"
            >
              <div className="relative">
                {ts.banner_url ? (
                  <img src={ts.banner_url} alt={ts.title} className="w-full h-40 md:h-32 object-cover bg-gray-100" />
                ) : (
                  <div className="w-full h-40 md:h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-100">
                    <span className="text-primary/40 font-bold text-lg">{ts.title}</span>
                  </div>
                )}
                {enrolledIds.has(ts.id) && (
                  <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg z-10 flex items-center gap-1.5 border border-emerald-400/50">
                    <CheckCircle2 size={14} /> ENROLLED
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-bold text-lg text-gray-900 leading-tight">{ts.title}</h3>
                {ts.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{ts.description}</p>
                )}

                {/* Key Features List */}
                {ts.linked_tests && ts.linked_tests.length > 0 && (
                  <div className="my-2 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {Object.entries(
                      ts.linked_tests.reduce((acc, test) => {
                        if (!acc[test.category]) acc[test.category] = [];
                        acc[test.category].push(test);
                        return acc;
                      }, {})
                    ).map(([category, tests], idx) => {
                      const colors = [
                        { bg: 'bg-blue-50/70', border: 'border-blue-100/70', iconBg: 'bg-[#0B2457]', icon: Layers },
                        { bg: 'bg-amber-50/70', border: 'border-amber-100/70', iconBg: 'bg-amber-500', icon: Languages },
                        { bg: 'bg-purple-50/70', border: 'border-purple-100/70', iconBg: 'bg-purple-600', icon: Newspaper },
                        { bg: 'bg-emerald-50/70', border: 'border-emerald-100/70', iconBg: 'bg-emerald-600', icon: Award },
                      ];
                      const color = colors[idx % colors.length];
                      const Icon = color.icon;
                      
                      return (
                        <div key={category} className={`flex items-center gap-2.5 text-xs font-semibold text-gray-800 ${color.bg} border ${color.border} px-3 py-2 rounded-xl`}>
                          <div className={`p-1 rounded-lg ${color.iconBg} text-white flex-shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <span>{tests.length} {category} {tests.length === 1 ? 'Test' : 'Tests'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-bold text-lg text-primary flex items-center">
                    {ts.price > 0 ? (
                      <>
                        <IndianRupee size={16} className="mr-0.5" />
                        {ts.price}
                      </>
                    ) : (
                      'Free'
                    )}
                  </span>
                  <button className="bg-primary text-white font-bold py-2 px-4 rounded-xl text-sm active:scale-95 transition-transform shadow-md">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
