import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

const fallbackMobileTestimonials = [
  { id: 'f1', image: '/testimonials/testimonial1.jpg', alt: 'Sanjeev Banotra - GoalPrep Testimonial' },
  { id: 'f2', image: '/testimonials/testimonial2.jpg', alt: 'Vikas Banotra - GoalPrep Testimonial' },
];

const fallbackWideTestimonials = [
  { id: 'fw1', image: '/testimonials/wide/banner1.png', alt: 'GoalPrep Banner 1' },
  { id: 'fw2', image: '/testimonials/wide/banner2.png', alt: 'GoalPrep Banner 2' },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [dynamicBanners, setDynamicBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('prepbuddy_banners')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setDynamicBanners(data);
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      if (desktop !== isDesktop) {
        setIsDesktop(desktop);
        setCurrentIndex(0);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktop]);

  const activeTestimonials = dynamicBanners.length > 0 
    ? dynamicBanners.map(b => ({
        id: b.id,
        image: isDesktop ? b.desktop_image_url : b.mobile_image_url,
        alt: 'Promotional Banner',
        link_url: b.link_url
      }))
    : (isDesktop ? fallbackWideTestimonials : fallbackMobileTestimonials);

  useEffect(() => {
    if (isPaused || activeTestimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeTestimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, activeTestimonials.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + activeTestimonials.length) % activeTestimonials.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeTestimonials.length);
  };

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden shadow-md bg-gray-900 aspect-square md:aspect-video border border-gray-100 mb-4 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div 
        className="flex w-full h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {activeTestimonials.map((t) => (
          <div key={t.id} className="w-full h-full flex-shrink-0 relative">
            {t.link_url ? (
              <a href={t.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                <img 
                  src={t.image} 
                  alt={t.alt} 
                  className="w-full h-full object-cover" 
                />
              </a>
            ) : (
              <img 
                src={t.image} 
                alt={t.alt} 
                className="w-full h-full object-cover" 
              />
            )}
          </div>
        ))}
      </div>

      {/* Left Arrow Button */}
      <button 
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-2 rounded-full transition-all active:scale-90 z-10"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Right Arrow Button */}
      <button 
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-2 rounded-full transition-all active:scale-90 z-10"
        aria-label="Next Slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Carousel Indicators (Dots) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              currentIndex === idx 
                ? 'w-6 h-2 bg-yellow-400' 
                : 'w-2 h-2 bg-white/60 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
