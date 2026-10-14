import { X } from 'lucide-react';
import styles from './SelectionCard.module.css';
import { Flag } from '../../components/Flag/Flag';
import { CITIES, getCity, getCountry } from '../../data/cities';
import type { Selection } from '../../app/store';

interface Props {
  selection: Selection;
  /** 도시별 방문 횟수 */
  visits: Map<string, number>;
  onClose: () => void;
}

function describe(selection: Selection, visits: Map<string, number>) {
  if (selection.kind === 'city') {
    const city = getCity(selection.id);
    if (!city) return null;
    const n = visits.get(city.id) ?? 0;
    return {
      title: city.name.ko,
      code: city.country,
      visited: n > 0,
      meta: `${getCountry(city.country)?.name.ko ?? city.country} · ${n > 0 ? `${n}번 방문` : '아직 안 가본 도시'}`,
    };
  }
  const country = getCountry(selection.code);
  if (!country) return null;
  const own = CITIES.filter((c) => c.country === country.code);
  const been = own.filter((c) => visits.has(c.id)).length;
  return {
    title: country.name.ko,
    code: country.code,
    visited: been > 0,
    meta: `${country.groupName} · 도시 ${been} / ${own.length}곳`,
  };
}

/** 지도에서 고른 도시·나라의 임시 상세 (Phase 5에서 도시 상세·나라 도장판으로 확장) */
export function SelectionCard({ selection, visits, onClose }: Props) {
  const info = describe(selection, visits);
  if (!info) return null;
  const { title, code, visited, meta } = info;

  return (
    <section className={styles.card} aria-label={`${title} 상세`}>
      <Flag code={code} size={36} visited={visited} alt="" />
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.meta}>{meta}</p>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
        <X size={20} aria-hidden />
      </button>
    </section>
  );
}
