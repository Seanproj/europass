/**
 * 캔버스 호출을 기록만 하는 가짜 2D 컨텍스트.
 * - 테스트: 카드 렌더 함수의 그리기 호출을 스냅샷으로 비교 (픽셀 비교 대신)
 * - 실행: 실제로 그리기 전에 한 번 돌려 쓰인 글꼴·글자를 모아 미리 불러온다
 */
export class RecordingContext {
  readonly ops: string[] = [];
  /** 글꼴별로 쓰인 글자 (document.fonts.load에 넘긴다) */
  readonly texts = new Map<string, string>();
  private state = {
    font: '10px sans-serif',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    letterSpacing: '0px',
    lineCap: 'butt',
    lineJoin: 'miter',
  };
  private stack: (typeof this.state)[] = [];

  constructor(readonly canvas: { width: number; height: number } = { width: 0, height: 0 }) {}

  private rec(op: string, ...args: unknown[]) {
    this.ops.push(`${op}(${args.map(fmt).join(', ')})`);
  }

  private prop<K extends keyof RecordingContext['state']>(k: K, v: RecordingContext['state'][K]) {
    if (this.state[k] === v) return;
    this.state[k] = v;
    this.ops.push(`${k}=${fmt(v)}`);
  }

  get font() {
    return this.state.font;
  }
  set font(v: string) {
    this.prop('font', v);
  }
  get fillStyle() {
    return this.state.fillStyle;
  }
  set fillStyle(v: string) {
    this.prop('fillStyle', v);
  }
  get strokeStyle() {
    return this.state.strokeStyle;
  }
  set strokeStyle(v: string) {
    this.prop('strokeStyle', v);
  }
  get lineWidth() {
    return this.state.lineWidth;
  }
  set lineWidth(v: number) {
    this.prop('lineWidth', v);
  }
  get globalAlpha() {
    return this.state.globalAlpha;
  }
  set globalAlpha(v: number) {
    this.prop('globalAlpha', v);
  }
  get textAlign() {
    return this.state.textAlign;
  }
  set textAlign(v: string) {
    this.prop('textAlign', v);
  }
  get textBaseline() {
    return this.state.textBaseline;
  }
  set textBaseline(v: string) {
    this.prop('textBaseline', v);
  }
  get letterSpacing() {
    return this.state.letterSpacing;
  }
  set letterSpacing(v: string) {
    this.prop('letterSpacing', v);
  }
  get lineCap() {
    return this.state.lineCap;
  }
  set lineCap(v: string) {
    this.prop('lineCap', v);
  }
  get lineJoin() {
    return this.state.lineJoin;
  }
  set lineJoin(v: string) {
    this.prop('lineJoin', v);
  }

  save() {
    this.stack.push({ ...this.state });
    this.rec('save');
  }
  restore() {
    this.state = this.stack.pop() ?? this.state;
    this.rec('restore');
  }
  translate(x: number, y: number) {
    this.rec('translate', x, y);
  }
  rotate(a: number) {
    this.rec('rotate', a);
  }
  scale(x: number, y: number) {
    this.rec('scale', x, y);
  }
  beginPath() {
    this.rec('beginPath');
  }
  closePath() {
    this.rec('closePath');
  }
  moveTo(x: number, y: number) {
    this.rec('moveTo', x, y);
  }
  lineTo(x: number, y: number) {
    this.rec('lineTo', x, y);
  }
  arc(x: number, y: number, r: number, a0: number, a1: number) {
    this.rec('arc', x, y, r, a0, a1);
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
    this.rec('arcTo', x1, y1, x2, y2, r);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number) {
    this.rec('ellipse', x, y, rx, ry, rot, a0, a1);
  }
  rect(x: number, y: number, w: number, h: number) {
    this.rec('rect', x, y, w, h);
  }
  fill() {
    this.rec('fill');
  }
  stroke() {
    this.rec('stroke');
  }
  clip() {
    this.rec('clip');
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.rec('fillRect', x, y, w, h);
  }
  clearRect(x: number, y: number, w: number, h: number) {
    this.rec('clearRect', x, y, w, h);
  }
  setLineDash(d: number[]) {
    this.rec('setLineDash', d);
  }
  fillText(text: string, x: number, y: number) {
    this.rec('fillText', text, x, y);
    this.texts.set(this.state.font, (this.texts.get(this.state.font) ?? '') + text);
  }
  /** 글자 폭 근사: 글자 크기 × 0.56 (고정폭 가정, 테스트용으로 결정적) */
  measureText(text: string) {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.state.font)?.[1] ?? 10);
    const spacing = parseFloat(this.state.letterSpacing) || 0;
    return { width: text.length * (px * 0.56 + spacing) };
  }
  drawImage(img: unknown, ...args: number[]) {
    const label = (img as { label?: string } | null)?.label ?? 'image';
    this.rec('drawImage', label, ...args);
  }
}

function fmt(v: unknown): string {
  if (typeof v === 'number') return String(Math.round(v * 100) / 100);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(fmt).join(',')}]`;
  return String(v);
}

/** 테스트 스냅샷용 요약: 글자와 이미지 호출은 그대로, 나머지는 종류별 개수 */
export function summarize(ops: string[]) {
  const counts: Record<string, number> = {};
  const content: string[] = [];
  for (const op of ops) {
    const name = /^[a-zA-Z]+/.exec(op)![0];
    counts[name] = (counts[name] ?? 0) + 1;
    if (name === 'fillText' || name === 'drawImage') content.push(op);
  }
  return { content, counts };
}
