import { resolveMediaUrl } from './resolveUrl';

// "Save to Gallery" for media viewed in the app (profile photos, posts…).
//
// Mobile-first strategy, desktop fallback:
// 1. If the Web Share API supports sharing files (Android WebView/Chrome
//    does), open the native share sheet with the file pre-attached — from
//    there the user picks "Save image"/"Save to Gallery"/"Download", which
//    drops it into the device gallery exactly like Telegram's share-based
//    save does.
// 2. Otherwise (desktop browsers, iOS Safari without files support) fall
//    back to a classic <a download> click, which saves to the Downloads
//    folder.
//
// Returns 'shared' | 'downloaded' so callers can show the right feedback,
// and throws with a readable message when neither works.
export async function saveToGallery(url, suggestedName = 'fairychat-photo') {
  const fullUrl = resolveMediaUrl(url);
  let blob;
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  } catch {
    // Network/CORS hiccup — fall back to a plain download link so the
    // browser itself handles fetching + saving.
    triggerDownload(fullUrl, suggestedName);
    return 'downloaded';
  }

  const extMatch = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
  const fileName = `${suggestedName}-${Date.now()}.${extMatch}`;

  if (navigator.canShare && navigator.canShare({ files: [new File([], fileName)] })) {
    try {
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // user closed the sheet — not an error
      // Any other share failure falls through to the download fallback.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownload(objectUrl, fileName);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }
  return 'downloaded';
}

function triggerDownload(href, fileName) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
