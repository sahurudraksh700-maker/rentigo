import { BookedRange } from '../types/marketplace';

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDaysISO(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function calculateRentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 0;
  // Inclusive day count (same-day pickup & return = 1 day)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function hasDateOverlap(
  startDate: string,
  endDate: string,
  bookedRanges: BookedRange[]
): boolean {
  if (!startDate || !endDate) return false;
  return bookedRanges.some(
    (range) => startDate <= range.endDate && endDate >= range.startDate
  );
}

export function isDateBooked(dateStr: string, bookedRanges: BookedRange[]): boolean {
  return bookedRanges.some(
    (range) => dateStr >= range.startDate && dateStr <= range.endDate
  );
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function compressImageFile(file: File): Promise<string> {
  const MAX_DATA_URL_LENGTH = 160000;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const dimensionSteps = [
          { maxWidth: 800, maxHeight: 600 },
          { maxWidth: 640, maxHeight: 480 },
          { maxWidth: 480, maxHeight: 360 },
        ];
        const qualitySteps = [0.72, 0.56, 0.42, 0.3];

        for (const dims of dimensionSteps) {
          const ratio = Math.min(
            dims.maxWidth / img.width,
            dims.maxHeight / img.height,
            1
          );
          const width = Math.max(1, Math.round(img.width * ratio));
          const height = Math.max(1, Math.round(img.height * ratio));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable.'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          for (const quality of qualitySteps) {
            const compressed = canvas.toDataURL('image/jpeg', quality);
            if (compressed.length <= MAX_DATA_URL_LENGTH) {
              resolve(compressed);
              return;
            }
          }
        }

        const fallbackCanvas = document.createElement('canvas');
        const fallbackRatio = Math.min(360 / img.width, 270 / img.height, 1);
        fallbackCanvas.width = Math.max(1, Math.round(img.width * fallbackRatio));
        fallbackCanvas.height = Math.max(1, Math.round(img.height * fallbackRatio));
        const fallbackCtx = fallbackCanvas.getContext('2d');
        if (!fallbackCtx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        fallbackCtx.fillStyle = '#FFFFFF';
        fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        fallbackCtx.drawImage(
          img,
          0,
          0,
          fallbackCanvas.width,
          fallbackCanvas.height
        );
        resolve(fallbackCanvas.toDataURL('image/jpeg', 0.25));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function compressVideoFrame(video: HTMLVideoElement): string {
  const MAX_DATA_URL_LENGTH = 160000;
  const srcWidth = video.videoWidth || 640;
  const srcHeight = video.videoHeight || 480;

  const dimensionSteps = [
    { maxWidth: 800, maxHeight: 600 },
    { maxWidth: 640, maxHeight: 480 },
    { maxWidth: 480, maxHeight: 360 },
  ];
  const qualitySteps = [0.72, 0.56, 0.42, 0.3];

  for (const dims of dimensionSteps) {
    const ratio = Math.min(
      dims.maxWidth / srcWidth,
      dims.maxHeight / srcHeight,
      1
    );
    const width = Math.max(1, Math.round(srcWidth * ratio));
    const height = Math.max(1, Math.round(srcHeight * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const compressed = canvas.toDataURL('image/jpeg', quality);
      if (compressed.length <= MAX_DATA_URL_LENGTH) {
        return compressed;
      }
    }
  }

  const fallbackCanvas = document.createElement('canvas');
  const fallbackRatio = Math.min(360 / srcWidth, 270 / srcHeight, 1);
  fallbackCanvas.width = Math.max(1, Math.round(srcWidth * fallbackRatio));
  fallbackCanvas.height = Math.max(1, Math.round(srcHeight * fallbackRatio));
  const fallbackCtx = fallbackCanvas.getContext('2d');
  if (!fallbackCtx) {
    throw new Error('Canvas context unavailable.');
  }
  fallbackCtx.fillStyle = '#FFFFFF';
  fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fallbackCtx.drawImage(
    video,
    0,
    0,
    fallbackCanvas.width,
    fallbackCanvas.height
  );
  return fallbackCanvas.toDataURL('image/jpeg', 0.25);
}

