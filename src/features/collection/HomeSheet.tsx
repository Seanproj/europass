import styles from './HomeSheet.module.css';
import { useUI } from '../../app/store';
import { Flag } from '../../components/Flag/Flag';
import { SearchField } from '../checkin/SearchField';
import { BottomSheet } from './BottomSheet';
import { SelectionCard } from './SelectionCard';
import type { Stats } from '../../lib/useStats';

interface Props {
  stats: Stats;
}

/** 항상 떠 있는 홈 시트: peek(검색 + 국기 줄) → half → full */
export function HomeSheet({ stats }: Props) {
  const snap = useUI((s) => s.sheetSnap);
  const setSnap = useUI((s) => s.setSheetSnap);
  const selection = useUI((s) => s.selection);
  const select = useUI((s) => s.select);

  return (
    <BottomSheet
      label="나의 유럽"
      snap={snap}
      onSnapChange={setSnap}
      header={
        <>
          <SearchField onOpen={() => setSnap('full')} />
          <FlagRow codes={stats.countryCodes} />
        </>
      }
    >
      {selection && (
        <SelectionCard selection={selection} visits={stats.counts} onClose={() => select(null)} />
      )}
      <section className={styles.mine}>
        <h2 className={styles.title}>나의 유럽</h2>
        <p className={styles.meta}>
          {stats.countries}개국 · {stats.cities}개 도시
          {stats.visits > stats.cities ? ` · ${stats.visits}번 방문` : ''}
        </p>
        {stats.visits === 0 && (
          <p className={styles.empty}>
            아직 도장이 없어요.
            <br />
            다녀온 도시를 검색해서 첫 도장을 찍어보세요.
          </p>
        )}
      </section>
    </BottomSheet>
  );
}

/** 방문한 나라의 국기 줄 */
function FlagRow({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return <p className={styles.flagHint}>첫 도장을 찍으면 여기에 국기가 모여요</p>;
  }
  const shown = codes.slice(0, 7);
  const more = codes.length - shown.length;
  return (
    <ul className={styles.flags} aria-label="방문한 나라">
      {shown.map((c) => (
        <li key={c} className={styles.flag}>
          <Flag code={c} size={30} visited />
        </li>
      ))}
      {more > 0 && <li className={styles.more}>+{more}</li>}
    </ul>
  );
}
