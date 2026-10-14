import { useId } from 'react';
import { getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { formatLat, formatLon, koreanDate, stampDate } from '../../lib/date';
import { fitMono, inkSeed, stampAngle, stampShape, type StampShape } from './stampMath';

interface Props {
  city: City;
  /** 없으면 아직 안 간 도시의 점선 고스트 도장 */
  visit?: { id: string; date: string } | null;
  /** 한 변 길이(px) */
  size?: number;
  /** 모양을 직접 정할 때 (테스트, 미리보기). 기본은 도시 id 해시 */
  shape?: StampShape;
  className?: string;
}

const C = 80; // viewBox 160의 가운데
const TEXT_W = 108;

/** 도장 v2: 이중선 테두리 + JetBrains Mono 타이포. 히든젬만 금색 */
export function Stamp({ city, visit, size = 160, shape = stampShape(city.id), className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ghost = !visit;
  const color = ghost ? 'var(--text-2)' : city.gem ? 'var(--gold)' : 'var(--accent)';
  const angle = visit ? stampAngle(visit.id) : 0;
  const country = (getCountry(city.country)?.name.en ?? city.country).toUpperCase();
  const name = city.name.local.toUpperCase();
  const dash = ghost ? '4 3' : undefined;

  const { frame, top, gap } = FRAMES[shape];
  const line = (sw: number) => ({
    fill: 'none',
    stroke: color,
    strokeWidth: sw,
    strokeDasharray: dash,
    strokeLinejoin: 'round' as const,
  });

  const text = (y: number, content: string, sizes: number[], weight: number, spacing: number) => {
    const f = fitMono(content, sizes, spacing, TEXT_W);
    return (
      <text
        x={C}
        y={y}
        textAnchor="middle"
        fontFamily="var(--mono)"
        fontSize={f.size}
        fontWeight={weight}
        letterSpacing={f.letterSpacing}
        textLength={f.fit}
        lengthAdjust={f.fit ? 'spacingAndGlyphs' : undefined}
        fill={color}
      >
        {content}
      </text>
    );
  };
  const nameFit = fitMono(name, [16, 13, 11, 9], 0.18, TEXT_W);
  const ruleHalf = nameFit.size >= 16 ? 28 : 34;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label={
        ghost ? `${city.name.ko} 도장 (아직 없음)` : `${city.name.ko} 도장, ${koreanDate(visit.date)}`
      }
    >
      {!ghost && (
        <defs>
          {/* 잉크 결: 아주 미세한 점 빠짐만. 번짐·왜곡 없음 */}
          <filter id={`ink-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".85"
              numOctaves={2}
              seed={inkSeed(city.id)}
              result="n"
            />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -9 0 0 0 7.1"
              result="holes"
            />
            <feComposite in="SourceGraphic" in2="holes" operator="in" />
          </filter>
        </defs>
      )}
      <g
        transform={angle ? `rotate(${angle} ${C} ${C})` : undefined}
        filter={ghost ? undefined : `url(#ink-${uid})`}
        opacity={ghost ? 0.55 : 0.94}
      >
        {frame(line)}
        {text(top, country, [6.5, 5.5], 500, 0.3)}
        {text(top + 20 * gap, name, [16, 13, 11, 9], 700, 0.18)}
        {text(top + 36 * gap, visit ? stampDate(visit.date) : '· · ·', [10], 500, 0.15)}
        <line
          x1={C - ruleHalf}
          y1={top + 44 * gap}
          x2={C + ruleHalf}
          y2={top + 44 * gap}
          stroke={color}
          strokeWidth={0.8}
        />
        {text(top + 56 * gap, formatLat(city.lat), [7], 500, 0.14)}
        {text(top + 66 * gap, formatLon(city.lon), [7], 500, 0.14)}
      </g>
    </svg>
  );
}

type LineProps = (sw: number) => Record<string, unknown>;

const ngon = (n: number, r: number, off: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = off + (i * 2 * Math.PI) / n;
    return `${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/** 모양별 테두리(굵은 선 2.6 + 가는 선 0.9)와 글자 시작 위치 */
const FRAMES: Record<StampShape, { frame: (line: LineProps) => React.ReactNode; top: number; gap: number }> =
  {
    circle: {
      top: 42,
      gap: 1,
      frame: (line) => (
        <>
          <circle cx={C} cy={C} r={72} {...line(2.6)} />
          <circle cx={C} cy={C} r={66} {...line(0.9)} />
        </>
      ),
    },
    oval: {
      top: 44,
      gap: 0.93,
      frame: (line) => (
        <>
          <ellipse cx={C} cy={C} rx={76} ry={58} {...line(2.6)} />
          <ellipse cx={C} cy={C} rx={70} ry={52} {...line(0.9)} />
        </>
      ),
    },
    rect: {
      top: 46,
      gap: 0.97,
      frame: (line) => (
        <>
          <rect x={8} y={26} width={144} height={108} rx={9} {...line(2.6)} />
          <rect x={14} y={32} width={132} height={96} rx={5} {...line(0.9)} />
        </>
      ),
    },
    oct: {
      top: 42,
      gap: 1,
      frame: (line) => (
        <>
          <polygon points={ngon(8, 74, Math.PI / 8)} {...line(2.6)} />
          <polygon points={ngon(8, 67, Math.PI / 8)} {...line(0.9)} />
        </>
      ),
    },
    hex: {
      top: 44,
      gap: 0.97,
      frame: (line) => (
        <>
          <polygon points="80,12 150,42 150,118 80,148 10,118 10,42" {...line(2.6)} />
          <polygon points="80,20 143,47 143,113 80,140 17,113 17,47" {...line(0.9)} />
        </>
      ),
    },
  };
