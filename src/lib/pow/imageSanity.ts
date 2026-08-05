export interface ImageSanityResult {
  ok: boolean;
  reason: string;
  entropy: number;
  avgBrightness: number;
}

export async function analyzeImageSanity(dataUrl: string): Promise<ImageSanityResult> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { ok: false, reason: 'Could not analyze image.', entropy: 0, avgBrightness: 0 };
  }

  const w = Math.min(128, img.width);
  const h = Math.min(128, img.height);
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  const histogram = new Array<number>(64).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    const bucket = Math.min(63, Math.floor(lum / 4));
    histogram[bucket]++;
  }

  const pixelCount = data.length / 4;
  const avgBrightness = sum / pixelCount;

  let entropy = 0;
  for (const count of histogram) {
    if (count === 0) continue;
    const p = count / pixelCount;
    entropy -= p * Math.log2(p);
  }

  if (avgBrightness < 18) {
    return {
      ok: false,
      reason: 'Image is too dark or blank. Show your actual work.',
      entropy,
      avgBrightness,
    };
  }

  if (entropy < 2.2) {
    return {
      ok: false,
      reason: 'Image lacks detail (solid color or blank). Capture your sketch.',
      entropy,
      avgBrightness,
    };
  }

  return { ok: true, reason: 'Image sanity passed', entropy, avgBrightness };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
