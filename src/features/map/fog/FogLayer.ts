import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import { MercatorCoordinate } from '../maplibre';
import cloudsUrl from './clouds.png';

export interface Hole {
  x: number;
  y: number;
  r: number;
}

export interface FogSource {
  fogColor: string;
  cloudColor: string;
  /** 화면 안에 있는 구멍만 (CSS px) */
  holes(): Hole[];
}

let sprite: HTMLCanvasElement | undefined;

/** 구멍 모양: 가운데 70%는 완전히 걷히고 가장자리 30%에서 번지는 원 */
function holeSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const size = 256;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/** 안개 바탕 불투명도, 구름 불투명도 */
const FOG_ALPHA = 0.55;
const CLOUD_ALPHA = 0.85;
/** 구름이 지도보다 느리게 움직이는 비율 (패럴랙스) */
const PARALLAX = 0.6;
/** 안개는 부드러워서 고해상도가 필요 없다. 업로드 비용을 줄이려고 배율 상한을 둔다 */
const MAX_SCALE = 1.5;

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = texture(u_tex, v_uv);
}`;

/**
 * 안개 레이어. 2D 캔버스에 (1) 안개색 (2) 구름 텍스처 (3) 방문 도시 구멍을 그리고,
 * 그 캔버스를 텍스처로 올려 지도 레이어 사이(바다·육지 위, 국기 퍼즐 아래)에 그린다.
 */
export class FogLayer implements CustomLayerInterface {
  readonly id = 'fog';
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map?: MapLibreMap;
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private clouds?: HTMLImageElement;
  private pattern?: { color: string; pattern: CanvasPattern };
  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private texture?: WebGLTexture;
  /** 지난번에 그린 안개의 조건. 같으면(타일만 새로 온 프레임 등) 다시 그리지도 올리지도 않는다 */
  private lastKey = '';

  constructor(private source: FogSource) {
    const img = new Image();
    img.onload = () => {
      this.clouds = img;
      this.map?.triggerRepaint();
    };
    img.src = cloudsUrl;
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext) {
    this.map = map;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    this.program = program;
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  onRemove(_map: MapLibreMap, gl: WebGL2RenderingContext) {
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.texture) gl.deleteTexture(this.texture);
  }

  render(gl: WebGL2RenderingContext) {
    if (!this.map || !this.program) return;
    const holes = this.source.holes();
    const key = this.frameKey(holes);
    const changed = key !== this.lastKey;
    if (changed) this.draw2d(holes);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture!);
    if (changed) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      this.lastKey = key;
    }
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_tex'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer!);
    const loc = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // MapLibre가 맞춰 둔 블렌딩(premultiplied alpha) 그대로 사용
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** 안개 그림을 바꾸는 것: 카메라, 화면 크기, 색, 구름 텍스처 준비 여부, 구멍 */
  private frameKey(holes: Hole[]): string {
    const map = this.map!;
    const c = map.getCenter();
    const { clientWidth: w, clientHeight: h } = map.getCanvas();
    const hs = holes.map((o) => `${o.x.toFixed(1)},${o.y.toFixed(1)},${o.r.toFixed(1)}`).join(';');
    return `${c.lng},${c.lat},${map.getZoom()},${w},${h},${window.devicePixelRatio},${this.source.fogColor},${this.source.cloudColor},${!!this.clouds},${hs}`;
  }

  private draw2d(holes: Hole[]) {
    const map = this.map!;
    const { clientWidth: w, clientHeight: h } = map.getCanvas();
    const scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const ctx = this.ctx;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // (1) 안개 바탕
    ctx.globalAlpha = FOG_ALPHA;
    ctx.fillStyle = this.source.fogColor;
    ctx.fillRect(0, 0, w, h);

    // (2) 구름: 지도 중심의 세계 좌표를 따라 느리게 이동
    const pattern = this.cloudPattern();
    if (pattern) {
      const mc = MercatorCoordinate.fromLngLat(map.getCenter());
      const world = 512 * 2 ** map.getZoom();
      const offsetX = -(mc.x * world * PARALLAX) % 512;
      const offsetY = -(mc.y * world * PARALLAX) % 512;
      pattern.setTransform(new DOMMatrix().translate(offsetX, offsetY));
      ctx.globalAlpha = CLOUD_ALPHA;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }

    // (3) 방문 도시 구멍: 미리 그려 둔 번진 원 하나를 크기만 바꿔 찍는다 (구멍마다 그라데이션을 만들면 느림)
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const sprite = holeSprite();
    for (const { x, y, r } of holes) {
      if (r <= 0.5) continue;
      ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** 흰색 + 알파 텍스처에 테마의 구름색을 입힌 패턴 (테마가 바뀔 때만 다시 만든다) */
  private cloudPattern(): CanvasPattern | null {
    if (!this.clouds) return null;
    const color = this.source.cloudColor;
    if (this.pattern?.color === color) return this.pattern.pattern;
    const tile = document.createElement('canvas');
    tile.width = this.clouds.width;
    tile.height = this.clouds.height;
    const t = tile.getContext('2d')!;
    t.drawImage(this.clouds, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = color;
    t.fillRect(0, 0, tile.width, tile.height);
    const pattern = this.ctx.createPattern(tile, 'repeat')!;
    this.pattern = { color, pattern };
    return pattern;
  }
}
