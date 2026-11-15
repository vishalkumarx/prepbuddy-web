import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Download, ExternalLink, Loader2, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import { resolvePdfBlob, downloadPdf } from '../utils/pdfHelper';

export default function PdfViewerModal({ isOpen, onClose, fileUrl, title }) {
  if (!isOpen || !fileUrl) return null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [useGoogleFallback, setUseGoogleFallback] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setUseGoogleFallback(false);

    const loadPdf = async () => {
      try {
        const { blobUrl: url } = await resolvePdfBlob(fileUrl);
        if (!isCancelled) {
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF in viewer modal:', err);
        if (!isCancelled) {
          // If direct resolve failed, try Google Docs viewer or display error
          setError(err.message || 'Failed to load PDF.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = () => {
    downloadPdf(fileUrl, title || 'document.pdf');
  };

  const iframeSrc = useGoogleFallback
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : blobUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-between animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="bg-gray-900/95 text-white px-3 sm:px-6 py-3 flex items-center justify-between border-b border-gray-800 shadow-md shrink-0 z-10">
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
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1.5">
              <span>Ready for viewing</span>
              <span className="text-gray-500">•</span>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="underline hover:text-white transition-colors"
              >
                Open in Full Tab
              </button>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="Open PDF in new tab"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">New Tab</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-colors"
            title="Download PDF"
          >
            <Download size={18} />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-colors ml-1"
            title="Close viewer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-gray-950/70 flex flex-col p-2 sm:p-4">
        {loading ? (
          <div className="m-auto flex flex-col items-center justify-center py-16 text-center text-white">
            <Loader2 size={36} className="animate-spin text-emerald-400 mb-3" />
            <p className="text-sm font-bold">Loading PDF Document...</p>
            <p className="text-xs text-gray-400 mt-1">Fetching document data securely</p>
          </div>
        ) : error ? (
          <div className="m-auto max-w-md p-6 bg-red-950/60 border border-red-800 rounded-3xl text-center text-white shadow-xl">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold">Unable to display PDF inline</h3>
            <p className="text-xs text-red-200 mt-1 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open in Browser Tab</span>
              </button>
              <button
                type="button"
                onClick={() => setUseGoogleFallback(!useGoogleFallback)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Try Google Viewer</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0 rounded-2xl bg-white shadow-2xl"
              title={title || 'PDF Preview'}
            />
            {/* Quick helper banner on mobile if browser doesn't render iframe PDFs */}
            <div className="sm:hidden absolute bottom-3 inset-x-4 bg-gray-900/90 text-white p-2.5 rounded-xl border border-gray-700/80 backdrop-blur-md flex items-center justify-between text-xs shadow-lg">
              <span className="text-[11px] text-gray-300">Viewing issues on mobile?</span>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]"
              >
                Open Fullscreen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
