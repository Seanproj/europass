import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import styles from './CountryTags.module.css';
import { Flag } from '../../../components/Flag/Flag';
import { COUNTRIES } from '../../../data/cities';
import type { CountryProgress } from '../puzzle/puzzle';
import type { FrameInfo } from '../MapController';
import { placeTags, type TagBox } from './collision';

/** 나라 태그가 보이는 줌 (5에서 5.5 사이에 사라진다) */
const SHOW_UNTIL = 5.5;
const FADE_FROM = 5;

export interface CountryTagsHandle {
  update(map: MapLibreMap, frame: FrameInfo): void;
}

interface Props {
  progress: Map<string, CountryProgress>;
  onPick: (code: string) => void;
}

/**
 * 나라 라벨 위치의 원형 국기 + 진행("5/12"). 41개라 DOM으로 두고, 위치는 매 프레임 직접 옮긴다 (React 렌더 없음)
 */
export const CountryTags = forwardRef<CountryTagsHandle, Props>(function CountryTags(
  { progress, onPick },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLButtonElement>());
  const sizes = useRef(new Map<string, { w: number; h: number }>());

  // 내용이 바뀌면 크기를 다시 잰다 (매 프레임 레이아웃을 읽지 않도록)
  useLayoutEffect(() => {
    for (const [code, el] of els.current) sizes.current.set(code, { w: el.offsetWidth, h: el.offsetHeight });
  }, [progress]);

  useImperativeHandle(ref, () => ({
    update(map, frame) {
      const root = rootRef.current;
      if (!root) return;
      // 자식에 visibility를 직접 주므로 부모는 display로 숨긴다
      if (frame.zoom > SHOW_UNTIL) {
        root.style.display = 'none';
        return;
      }
      const opacity = frame.zoom < FADE_FROM ? 1 : (SHOW_UNTIL - frame.zoom) / (SHOW_UNTIL - FADE_FROM);
      root.style.display = '';
      root.style.opacity = String(opacity);
      // 거의 사라진 태그가 지도 탭을 가로채지 않게
      root.dataset.passive = opacity < 0.5 ? 'true' : 'false';

      const boxes: TagBox[] = [];
      const pos = new Map<string, { x: number; y: number }>();
      for (const c of COUNTRIES) {
        const p = map.project(c.center);
        const size = sizes.current.get(c.code) ?? { w: 60, h: 36 };
        pos.set(c.code, p);
        const pr = progress.get(c.code);
        boxes.push({
          id: c.code,
          // 보이는 부분(가운데 정렬) 기준으로 판정
          rect: { x: p.x - size.w / 2, y: p.y - size.h / 2, w: size.w, h: size.h },
          priority: (pr?.painted ?? 0) * 1000 + c.cityCount,
        });
      }
      const visible = placeTags(boxes, frame.lenses);
      for (const [code, el] of els.current) {
        const p = pos.get(code)!;
        const offset = visible.get(code);
        const show = offset !== undefined;
        const [dx, dy] = offset ?? [0, 0];
        el.style.transform = `translate(${Math.round(p.x + dx)}px, ${Math.round(p.y + dy)}px) translate(-50%, -50%)`;
        el.style.visibility = show ? 'visible' : 'hidden';
        el.tabIndex = show ? 0 : -1;
      }
    },
  }));

  return (
    <div ref={rootRef} className={styles.root}>
      {COUNTRIES.map((c) => {
        const p = progress.get(c.code);
        const visited = (p?.painted ?? 0) > 0;
        const complete = !!p?.complete;
        const label = complete
          ? `${c.name.ko} 완성`
          : visited
            ? `${c.name.ko} ${p!.painted}/${p!.total}조각`
            : c.name.ko;
        return (
          <button
            key={c.code}
            ref={(el) => {
              if (el) els.current.set(c.code, el);
              else els.current.delete(c.code);
            }}
            type="button"
            className={styles.tag}
            data-state={complete ? 'complete' : visited ? 'visited' : 'none'}
            aria-label={label}
            onClick={() => onPick(c.code)}
          >
            <span className={styles.pill}>
              <Flag code={c.code} size={18} visited={visited} alt="" />
              {complete ? (
                <span className={styles.text}>
                  <Check size={12} strokeWidth={3} aria-hidden />
                  {c.name.ko} 완성
                </span>
              ) : visited ? (
                <span className={styles.text}>
                  <b>{p!.painted}</b>/{p!.total}
                </span>
              ) : (
                <span className={styles.name}>{c.name.ko}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
});
