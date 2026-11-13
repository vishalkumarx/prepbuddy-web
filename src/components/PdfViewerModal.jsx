import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import '../utils/pdfPolyfill';
import { 
  X, ArrowLeft, Download, ExternalLink, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, Loader2, FileText, AlertCircle 
} from 'lucide-react';

// Configure pdfjs worker with fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
}

export default function PdfViewerModal({ isOpen, onClose, fileUrl, title }) {
  if (!isOpen || !fileUrl) return null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [renderedPages, setRenderedPages] = useState({});
  const [renderingPage, setRenderingPage] = useState(false);
  const canvasRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setRenderedPages({});

    const loadPdf = async () => {
      try {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
        }

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@6.3.289/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF in viewer:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to load PDF.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > totalPages) return;

    let isCancelled = false;
    setRenderingPage(true);

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const targetScale = isMobile ? Math.max(scale, 0.95) : scale;
        const viewport = page.getViewport({ scale: targetScale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error(`Error rendering page ${currentPage}:`, err);
      } finally {
        if (!isCancelled) {
          setRenderingPage(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, totalPages]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.75));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col justify-between animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="bg-gray-900/95 text-white px-3 sm:px-6 py-3 flex items-center justify-between border-b border-gray-800 shadow-md flex-shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all shrink-0"
            title="Close"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
              {title || 'PDF Document'}
            </h2>
            {totalPages > 0 && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Controls (hidden on very small screens) */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-xl p-0.5 mr-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-gray-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={18} />
          </a>

          <a
            href={fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Download PDF"
          >
            <Download size={18} />
          </a>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-1"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-start p-2 sm:p-4 relative bg-gray-950/60 custom-scrollbar">
        {loading ? (
          <div className="m-auto flex flex-col items-center justify-center py-16 text-center text-white">
            <Loader2 size={36} className="animate-spin text-emerald-400 mb-3" />
            <p className="text-sm font-bold">Loading PDF Document...</p>
            <p className="text-xs text-gray-400 mt-1">Preparing all pages for smooth viewing</p>
          </div>
        ) : error ? (
          <div className="m-auto max-w-md p-6 bg-red-950/50 border border-red-800 rounded-3xl text-center text-white">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold">Unable to render PDF</h3>
            <p className="text-xs text-red-200 mt-1 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Open in Browser
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center my-auto transition-transform duration-150">
            {renderingPage && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center rounded-xl z-20">
                <Loader2 size={28} className="animate-spin text-white" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="bg-white rounded-xl shadow-2xl max-w-full h-auto select-none border border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Toolbar */}
      {totalPages > 0 && !loading && !error && (
        <footer className="bg-gray-900/90 text-white px-4 py-3 border-t border-gray-800/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all text-white"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous Page</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl">
              Page {currentPage} of {totalPages}
            </span>
            {/* Quick jump input on desktop */}
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                }
              }}
              className="hidden md:inline w-12 text-center bg-white/10 border border-white/20 rounded-xl py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              title="Jump to page"
            />
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all text-white"
          >
            <span className="hidden sm:inline">Next Page</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      )}
    </div>
  );
}
