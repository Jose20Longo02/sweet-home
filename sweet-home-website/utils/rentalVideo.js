function videoFileName(url) {
  let pathname = String(url || '').trim();
  if (!pathname) return null;
  try {
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
      pathname = new URL(pathname).pathname;
    }
  } catch (_) {
    return null;
  }
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch (_) {}
  const normalized = decoded.replace(/\\/g, '/');
  const marker = '/furnished-rentals/videos/';
  const at = normalized.indexOf(marker);
  if (at === -1) return null;
  const name = normalized.slice(at + marker.length);
  if (!name || name.includes('/') || name.includes('..')) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}

function isStoredRentalVideo(url) {
  return Boolean(videoFileName(url));
}

function youtubeId(url) {
  const value = String(url || '');
  const match = value.match(/youtu\.be\/([\w-]+)/)
    || value.match(/youtube\.com\/embed\/([\w-]+)/)
    || value.match(/youtube\.com\/shorts\/([\w-]+)/)
    || value.match(/[?&]v=([\w-]+)/);
  return match ? match[1] : '';
}

function vimeoId(url) {
  const match = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : '';
}

function presentRentalVideo(url) {
  const value = String(url || '').trim();
  if (!value) return null;
  if (/youtu\.be|youtube\.com/i.test(value)) {
    const id = youtubeId(value);
    if (!id) return { kind: 'link', url: value, embed: '' };
    return {
      kind: 'youtube',
      url: value,
      embed: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`
    };
  }
  if (/vimeo\.com/i.test(value)) {
    const id = vimeoId(value);
    if (!id) return { kind: 'link', url: value, embed: '' };
    return {
      kind: 'vimeo',
      url: value,
      embed: `https://player.vimeo.com/video/${id}?playsinline=1`
    };
  }
  return { kind: 'file', url: value, embed: '' };
}

function parseVideoLink(raw) {
  const link = String(raw || '').trim();
  if (!link) return { error: 'Paste a video link, or choose no video.' };
  if (link.length > 500) return { error: 'That video link is too long.' };
  let parsed;
  try {
    parsed = new URL(link);
  } catch (_) {
    return { error: 'The video link must be a full address, starting with https://.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { error: 'The video link must start with https://.' };
  }
  return { url: link };
}

function resolveRentalVideo({ source, link, uploadedUrl, existingUrl }) {
  if (source === 'link') return parseVideoLink(link);
  if (source === 'upload') {
    if (uploadedUrl) return { url: uploadedUrl };
    if (existingUrl && isStoredRentalVideo(existingUrl)) return { url: existingUrl };
    return { error: 'Choose a video file, or paste a link instead.' };
  }
  return { url: null };
}

function videoSourceFor(url) {
  if (!url) return 'none';
  return isStoredRentalVideo(url) ? 'upload' : 'link';
}

module.exports = {
  videoFileName,
  isStoredRentalVideo,
  presentRentalVideo,
  resolveRentalVideo,
  videoSourceFor
};
