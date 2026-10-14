import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import styles from './CityMarkers.module.css';
import type { City } from '../../../data/types';

export interface CityMarkersHandle {
  update(map: MapLibreMap): void;
}

interface Props {
  /** 방문한 도시 (서쪽에서 동쪽 순으로 Tab이 이동) */
  cities: { city: City; visits: number }[];
  onPick: (cityId: string) => void;
}

/**
 * 키보드로 지도의 방문 도시를 고르는 버튼들. 도장 렌즈는 캔버스라 포커스를 받을 수 없어서,
 * 같은 자리에 보이지 않는 버튼을 두고 포커스를 받으면 고리를 보여 준다.
 * 손가락·마우스는 지금처럼 캔버스가 받는다 (pointer-events: none)
 */
export const CityMarkers = forwardRef<CityMarkersHandle, Props>(function CityMarkers(
  { cities, onPick },
  ref,
) {
  const els = useRef(new Map<string, HTMLButtonElement>());

  useImperativeHandle(ref, () => ({
    update(map) {
      const { clientWidth: w, clientHeight: h } = map.getCanvas();
      for (const { city } of cities) {
        const el = els.current.get(city.id);
        if (!el) continue;
        const p = map.project([city.lon, city.lat]);
        const inside = p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;
        el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
        // 화면 밖 도시는 Tab 순서에서 뺀다
        el.tabIndex = inside ? 0 : -1;
      }
    },
  }));

  return (
    <div className={styles.root} role="group" aria-label="지도의 방문한 도시">
      {[...cities]
        .sort((a, b) => a.city.lon - b.city.lon)
        .map(({ city, visits }) => (
          <button
            key={city.id}
            ref={(el) => {
              if (el) els.current.set(city.id, el);
              else els.current.delete(city.id);
            }}
            type="button"
            className={styles.marker}
            tabIndex={-1}
            aria-label={visits > 1 ? `${city.name.ko}, ${visits}번 방문` : `${city.name.ko}, 방문함`}
            onClick={() => onPick(city.id)}
          />
        ))}
    </div>
  );
});
