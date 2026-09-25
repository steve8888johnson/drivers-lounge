// Photos often contain small, perspective-distorted QR codes. Scan overlapping
// crops locally so a failed full-page decode never forces a third-party upload.
export function decodePhotoPixels(pixels, width, height, decoder) {
  const results = new Set();
  const decode = (data, w, h) => {
    const result = decoder(data, w, h, { inversionAttempts: 'attemptBoth' });
    if (result) results.add(result.data);
    return result;
  };
  const full = new Uint8ClampedArray(pixels);
  // Mask already-read codes so two different QR references on a page are retained.
  for (let i = 0; i < 8; i++) {
    const result = decode(full, width, height); if (!result) break;
    const corners = [result.location.topLeftCorner, result.location.topRightCorner, result.location.bottomLeftCorner, result.location.bottomRightCorner];
    const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
    const left = Math.max(0, Math.floor(Math.min(...xs) - 8)), right = Math.min(width, Math.ceil(Math.max(...xs) + 8));
    const top = Math.max(0, Math.floor(Math.min(...ys) - 8)), bottom = Math.min(height, Math.ceil(Math.max(...ys) + 8));
    for (let y = top; y < bottom; y++) full.fill(255, (y * width + left) * 4, (y * width + right) * 4);
  }
  const cropWidth = Math.ceil(width * .52), cropHeight = Math.ceil(height * .42);
  for (const fx of [0, .5, 1]) for (const fy of [0, .33, .66, 1]) {
    const left = Math.floor((width - cropWidth) * fx), top = Math.floor((height - cropHeight) * fy);
    const data = new Uint8ClampedArray(cropWidth * cropHeight * 4);
    for (let y = 0; y < cropHeight; y++) data.set(pixels.subarray(((top + y) * width + left) * 4, ((top + y) * width + left + cropWidth) * 4), y * cropWidth * 4);
    if (decode(data, cropWidth, cropHeight)) continue;
    for (const threshold of [110, 150, 190]) {
      const mono = new Uint8ClampedArray(data);
      for (let n = 0; n < mono.length; n += 4) { const value = (data[n] + data[n + 1] + data[n + 2]) / 3 >= threshold ? 255 : 0; mono[n] = mono[n + 1] = mono[n + 2] = value; }
      if (decode(mono, cropWidth, cropHeight)) break;
    }
  }
  return [...results];
}
