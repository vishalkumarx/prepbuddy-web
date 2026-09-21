import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function WebViewModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-sm font-semibold text-gray-800 truncate px-4">
          {new URL(url).hostname}
        </h2>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-full text-indigo-600 transition-colors"
          title="Open in external browser"
        >
          <ExternalLink size={20} />
        </a>
      </div>
      <div className="flex-1 bg-gray-50 relative">
        <iframe 
          src={url} 
          title="Inbuilt Web View"
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
