export const BACKDROP_SCALE = 2;

export function coverScale(iw: number, ih: number, vw: number, vh: number): number {
  return Math.max(BACKDROP_SCALE, Math.ceil(Math.max(vw / iw, vh / ih)));
}

export function paintBackdrop(cv: HTMLCanvasElement, img: HTMLImageElement, dpr: number): void {
  const vw = cv.clientWidth,
    vh = cv.clientHeight;
  if (!vw || !vh || !img.naturalWidth) return;
  const k = coverScale(img.naturalWidth, img.naturalHeight, vw, vh) * dpr;
  cv.width = Math.round(vw * dpr);
  cv.height = Math.round(vh * dpr);
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const w = Math.round(img.naturalWidth * k),
    h = Math.round(img.naturalHeight * k);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round((cv.width - w) / 2), Math.round((cv.height - h) / 2), w, h);
}
