import '../vendor/jsQR-1.4.0.js';
import { decodePhotoPixels } from './qr-scan.mjs';
self.onmessage = ({ data }) => {
  try { self.postMessage({ codes: decodePhotoPixels(new Uint8ClampedArray(data.pixels), data.width, data.height, self.jsQR) }); }
  catch { self.postMessage({ error: 'QR decoding failed. Try a clearer photo or enter the permit manually.' }); }
};
