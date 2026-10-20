export const LOGO_LIMIT = 5 * 1024 * 1024;

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic'
};

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);

function ascii(bytes, start, end) {
  let out = '';
  for (let i = start; i < end && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function hasMarkup(bytes) {
  const text = Buffer.from(bytes).toString('latin1').toLowerCase();
  return text.includes('<svg') || text.includes('<script') || text.includes('/javascript');
}

function isHeic(bytes) {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== 'ftyp') return false;
  const box = Math.min(bytes.length, 64);
  for (let i = 8; i + 4 <= box; i += 4) {
    if (HEIC_BRANDS.has(ascii(bytes, i, i + 4).toLowerCase())) return true;
  }
  return false;
}

function magicKind(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')) return 'gif';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  if (bytes.length >= 5 && ascii(bytes, 0, 4) === '%PDF') return 'pdf';
  if (isHeic(bytes)) return 'heic';
  return '';
}

export function sniffLogo(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  if (bytes.length > LOGO_LIMIT) return { error: 'logo_too_large' };
  if (!bytes.length || hasMarkup(bytes)) return { error: 'logo_type' };
  const kind = magicKind(bytes);
  if (!kind) return { error: 'logo_type' };
  return { kind, contentType: CONTENT_TYPES[kind] };
}
