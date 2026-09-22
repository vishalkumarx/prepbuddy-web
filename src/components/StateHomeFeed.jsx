import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { IndianRupee } from 'lucide-react';

export default function StateHomeFeed() {
  const [testSeries, setTestSeries] = useState([]);
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

    fetchTestSeries();

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
      {testSeries.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p>No test series available yet.</p>
        </div>
      ) : (
        testSeries.map((ts) => (
          <div key={ts.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            {ts.banner_url ? (
              <img src={ts.banner_url} alt={ts.title} className="w-full h-48 object-cover bg-gray-100" />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-100">
                <span className="text-primary/40 font-bold text-lg">{ts.title}</span>
              </div>
            )}
            
            <div className="p-4 flex flex-col gap-2">
              <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2">{ts.title}</h3>
              {ts.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{ts.description}</p>
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
        ))
      )}
    </div>
  );
}
