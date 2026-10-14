/* eslint-disable react-refresh/only-export-components -- 개발용 진입 파일 */
/**
 * 개발 서버 전용 도장 견본: /stamps.html (빌드에는 들어가지 않는다)
 * ?theme=dark, ?canvas (공유 카드용 캔버스 도장으로 그리기)
 */
import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { Stamp } from '../components/Stamp/Stamp';
import { drawStamp } from '../components/Stamp/drawStamp';
import { STAMP_SHAPES, type StampShape } from '../components/Stamp/stampMath';
import { STAMP_ORNAMENTS, type StampOrnament } from '../components/Stamp/stampParts';
import { CITIES, getCity } from '../data/cities';
import type { City } from '../data/types';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const VISIT = { id: 'sample-visit-3', date: '2026-10-13' };
const gem = CITIES.find((c) => c.gem)!;
const SAMPLES: { city: City; nth?: number; label: string }[] = [
  { city: getCity('cz-prague')!, label: '수도' },
  { city: getCity('de-heidelberg') ?? getCity('de-munich')!, nth: 3, label: '재방문 III' },
  { city: gem, label: '히든젬' },
  { city: getCity('ba-sarajevo')!, nth: 2, label: '긴 나라 이름 · II' },
];

function CanvasStamp({ city, nth, shape }: { city: City; nth?: number; shape: StampShape }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts.ready.then(() => paint());
    const paint = () => {
      const cv = ref.current!;
      const ctx = cv.getContext('2d')!;
      const css = getComputedStyle(document.documentElement);
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 120, 120);
      void shape;
      drawStamp(ctx, {
        city,
        visit: VISIT,
        nth,
        x: 60,
        y: 60,
        size: 112,
        angle: 0,
        ink: css.getPropertyValue(city.gem ? '--gold' : '--accent'),
        paper: css.getPropertyValue('--bg'),
        mono: css.getPropertyValue('--mono'),
      });
    };
  }, [city, nth, shape]);
  return <canvas ref={ref} width={240} height={240} style={{ width: 120, height: 120 }} />;
}

function Sheet() {
  const canvas = params.has('canvas');
  const cell = {
    display: 'grid',
    placeItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--text-2)',
  } as const;
  return (
    <main style={{ padding: 16, background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      <h1 style={{ fontSize: 16, margin: '0 0 12px' }}>도장 v3 견본 — 모양 5종 × 장식 4종</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(4, 120px)',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <span />
        {STAMP_ORNAMENTS.map((o) => (
          <span key={o} style={cell}>
            {o}
          </span>
        ))}
        {STAMP_SHAPES.map((shape) => (
          <Row key={shape} shape={shape} />
        ))}
      </div>
      <h2 style={{ fontSize: 14, margin: '20px 0 8px' }}>표식{canvas ? ' (캔버스)' : ''}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SAMPLES.map((s) => (
          <figure key={s.label} style={{ ...cell, margin: 0 }}>
            {canvas ? (
              <CanvasStamp city={s.city} nth={s.nth} shape="circle" />
            ) : (
              <Stamp city={s.city} visit={VISIT} nth={s.nth} size={120} />
            )}
            <figcaption>{s.label}</figcaption>
          </figure>
        ))}
        <figure style={{ ...cell, margin: 0 }}>
          <Stamp city={SAMPLES[0]!.city} size={120} />
          <figcaption>고스트</figcaption>
        </figure>
      </div>
    </main>
  );
}

function Row({ shape }: { shape: StampShape }) {
  const city = getCity('cz-prague')!;
  return (
    <>
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{shape}</span>
      {STAMP_ORNAMENTS.map((o: StampOrnament) => (
        <Stamp
          key={o}
          city={city}
          visit={VISIT}
          shape={shape}
          ornament={o}
          nth={o === 'dots' ? 2 : undefined}
          size={120}
        />
      ))}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sheet />
  </StrictMode>,
);
