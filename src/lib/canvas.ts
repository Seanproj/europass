/**
 * 카드 그리기 함수가 쓰는 2D 컨텍스트 부분집합.
 * 브라우저의 CanvasRenderingContext2D와 테스트용 RecordingContext가 둘 다 만족한다
 */
export interface Ctx {
  font: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  textAlign: CanvasTextAlign | string;
  textBaseline: CanvasTextBaseline | string;
  letterSpacing: string;
  lineCap: CanvasLineCap | string;
  lineJoin: CanvasLineJoin | string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  setLineDash(d: number[]): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  drawImage(img: CanvasImageSource, ...args: number[]): void;
}

/** 이미지 크기 (CanvasImageSource마다 속성 이름이 달라서) */
export function imageSize(img: CanvasImageSource): { w: number; h: number } {
  const i = img as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  return { w: i.naturalWidth || Number(i.width) || 0, h: i.naturalHeight || Number(i.height) || 0 };
}

/** 둥근 사각형 경로 (roundRect가 없는 브라우저도 있어 arcTo로) */
export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : [r[0]!, r[1]!, r[2]!, r[3]!];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.arcTo(x + w, y, x + w, y + h, tr);
  ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.arcTo(x, y + h, x, y, bl);
  ctx.arcTo(x, y, x + w, y, tl);
  ctx.closePath();
}

/** 이미지를 영역에 꽉 채워 그린다 (가운데 기준으로 넘치는 부분을 자름) */
export function drawCover(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const { w: iw, h: ih } = imageSize(img);
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

/** 재현 가능한 의사난수 (도장 잉크 결) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
