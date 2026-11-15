import { supabase } from '../supabase';

// In-memory cache for resolved PDF blob URLs to avoid re-downloading
const blobCache = new Map();

/**
 * Extracts bucket and path from a Supabase storage URL.
 * Handles both public and authenticated URLs:
 * /storage/v1/object/public/<bucket>/<path>
 * /storage/v1/object/<bucket>/<path>
 */
export function parseSupabaseStorageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
  if (!match) return null;
  return {
    bucket: match[1],
    path: decodeURIComponent(match[2].split('?')[0]),
  };
}

/**
 * Resolves a PDF URL into a valid Blob and Blob URL.
 * If the URL points to Supabase storage, downloads it using the authenticated Supabase client
 * to bypass RLS/policy 403 restrictions on private or unlisted buckets.
 */
export async function resolvePdfBlob(url) {
  if (!url) throw new Error('No PDF URL provided');

  if (blobCache.has(url)) {
    return blobCache.get(url);
  }

  const supabaseInfo = parseSupabaseStorageUrl(url);

  let blob = null;

  if (supabaseInfo) {
    const { data, error } = await supabase.storage
      .from(supabaseInfo.bucket)
      .download(supabaseInfo.path);

    if (error) {
      console.warn(`Supabase storage download failed for ${url}, trying direct fetch:`, error);
    } else if (data) {
      blob = data;
    }
  }

  // Fallback to fetch if not Supabase or if download returned null
  if (!blob) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF (status ${response.status})`);
    }
    blob = await response.blob();
  }

  const blobUrl = URL.createObjectURL(blob);
  const result = { blob, blobUrl };
  blobCache.set(url, result);
  return result;
}

/**
 * Opens a PDF in a new browser tab instantly.
 * Pre-opens the window to avoid popup blockers, then navigates to the resolved blob URL.
 */
export async function openPdfInNewTab(url, title = 'PDF Document') {
  if (!url) return;

  // Pre-open tab to prevent popup blocker
  const newTab = window.open('about:blank', '_blank');
  if (newTab) {
    try {
      newTab.document.title = title;
      newTab.document.body.innerHTML = `
        <div style="font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#fff;">
          <div style="width:36px;height:36px;border:3px solid #34d399;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;"></div>
          <p style="font-size:16px;font-weight:600;margin:0 0 8px;">Opening ${title}...</p>
          <p style="font-size:12px;color:#94a3b8;margin:0;">Loading document securely</p>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        </div>
      `;
    } catch (e) {
      // Ignored if access restricted
    }
  }

  try {
    const { blobUrl } = await resolvePdfBlob(url);
    if (newTab && !newTab.closed) {
      newTab.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank');
    }
  } catch (err) {
    console.error('Error opening PDF in new tab:', err);
    if (newTab && !newTab.closed) {
      newTab.location.href = url; // Fallback to raw URL
    } else {
      window.open(url, '_blank');
    }
  }
}

/**
 * Triggers a direct browser download of the PDF.
 */
export async function downloadPdf(url, filename = 'document.pdf') {
  try {
    const { blobUrl } = await resolvePdfBlob(url);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    window.open(url, '_blank');
  }
}

