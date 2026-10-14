import type { City } from '../../data/types';
import { mulberry32, type Ctx } from '../../lib/canvas';
import {
  FRAMES,
  INNER_WIDTH,
  OUTER_WIDTH,
  STAMP_BOX,
  STAMP_C,
  stampLayout,
  type Outline,
} from './stampGeometry';
import { inkSeed, stampAngle, stampShape } from './stampMath';

export interface DrawStampOptions {
  city: City;
  /** 없으면 점선 고스트 도장 */
  visit: { id: string; date: string } | null;
  /** 가운데 좌표와 한 변 길이 (px) */
  x: number;
  y: number;
  size: number;
  /** 잉크색 (보통 --accent, 히든젬은 --gold), 종이색 (잉크 결 점) */
  ink: string;
  paper: string;
  mono: string;
  /** 기본은 방문 id로 정한 각도 */
  angle?: number;
  alpha?: number;
  /** 테두리만 (겹쳐 쌓인 이전 도장) */
  outlineOnly?: boolean;
}

function outlinePath(ctx: Ctx, o: Outline) {
  ctx.beginPath();
  if (o.kind === 'circle') ctx.arc(STAMP_C, STAMP_C, o.r, 0, Math.PI * 2);
  else if (o.kind === 'ellipse') ctx.ellipse(STAMP_C, STAMP_C, o.rx, o.ry, 0, 0, Math.PI * 2);
  else if (o.kind === 'rect') {
    const { x, y, w, h, r } = o;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  } else {
    o.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  }
  ctx.closePath();
}

/** SVG 도장(Stamp.tsx)과 같은 모양을 캔버스에 그린다 (공유 카드용) */
export function drawStamp(ctx: Ctx, o: DrawStampOptions) {
  const shape = stampShape(o.city.id);
  const ghost = !o.visit;
  const { outer, inner } = FRAMES[shape];
  const { lines, rule } = stampLayout(o.city, o.visit?.date ?? null, shape);
  const angle = o.angle ?? (o.visit ? stampAngle(o.visit.id) : 0);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate((angle * Math.PI) / 180);
  const k = o.size / STAMP_BOX;
  ctx.scale(k, k);
  ctx.translate(-STAMP_C, -STAMP_C);
  ctx.globalAlpha = (o.alpha ?? 1) * (ghost ? 0.55 : 0.94);
  ctx.strokeStyle = o.ink;
  ctx.fillStyle = o.ink;
  ctx.lineJoin = 'round';
  ctx.setLineDash(ghost ? [4, 3] : []);
  ctx.lineWidth = OUTER_WIDTH;
  outlinePath(ctx, outer);
  ctx.stroke();
  ctx.lineWidth = INNER_WIDTH;
  outlinePath(ctx, inner);
  ctx.stroke();
  ctx.setLineDash([]);

  if (o.outlineOnly) {
    ctx.restore();
    return;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const l of lines) {
    ctx.font = `${l.weight} ${l.size}px ${o.mono}`;
    ctx.letterSpacing = `${l.letterSpacing}px`;
    const w = ctx.measureText(l.text).width;
    if (l.fit && w > l.fit) {
      // 넘치는 이름은 가로로 눌러 담는다 (SVG의 textLength와 같은 효과)
      ctx.save();
      ctx.translate(STAMP_C, l.y);
      ctx.scale(l.fit / w, 1);
      ctx.fillText(l.text, 0, 0);
      ctx.restore();
    } else ctx.fillText(l.text, STAMP_C, l.y);
  }
  ctx.letterSpacing = '0px';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(STAMP_C - rule.half, rule.y);
  ctx.lineTo(STAMP_C + rule.half, rule.y);
  ctx.stroke();

  // 잉크 결: 종이색 점을 조금 찍어 고무도장처럼 (도시마다 같은 무늬)
  if (!ghost) {
    const rand = mulberry32(inkSeed(o.city.id));
    ctx.fillStyle = o.paper;
    ctx.globalAlpha = 0.9 * (o.alpha ?? 1);
    for (let i = 0; i < 70; i++) {
      const x = 8 + rand() * 144;
      const y = 8 + rand() * 144;
      ctx.beginPath();
      ctx.arc(x, y, 0.35 + rand() * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
