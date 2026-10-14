import styles from './FlagRings.module.css';
import { navigate } from '../../app/nav';
import { Flag } from '../../components/Flag/Flag';
import { getCountry } from '../../data/cities';
import type { CountryProgress } from './progress';

const SIZE = 40;
const STROKE = 3;
const R = (SIZE - STROKE) / 2;
const LEN = 2 * Math.PI * R;

/** peek에서도 보이는 방문 국기 줄. 국기 둘레 링 = 칠한 조각 비율, 완성하면 금색 */
export function FlagRings({ list }: { list: CountryProgress[] }) {
  if (list.length === 0) return <p className={styles.hint}>첫 도장을 찍으면 여기에 국기가 모여요</p>;
  return (
    // 가로로 넘겨보는 줄이라 시트 드래그가 시작되지 않게
    <ul className={styles.row} aria-label="방문한 나라" onPointerDown={(e) => e.stopPropagation()}>
      {list.map((p) => {
        const name = getCountry(p.code)?.name.ko ?? p.code;
        const ratio = p.pieces ? p.painted / p.pieces : 0;
        return (
          <li key={p.code}>
            <button
              type="button"
              className={styles.item}
              onClick={() => navigate({ kind: 'country', code: p.code })}
              aria-label={p.complete ? `${name} 완성` : `${name} ${p.painted}/${p.pieces}조각`}
            >
              <svg
                className={styles.ring}
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                aria-hidden
              >
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} className={styles.track} strokeWidth={STROKE} />
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  className={p.complete ? styles.done : styles.fill}
                  strokeWidth={STROKE}
                  strokeDasharray={`${LEN * ratio} ${LEN}`}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              </svg>
              <Flag code={p.code} size={30} visited alt="" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
