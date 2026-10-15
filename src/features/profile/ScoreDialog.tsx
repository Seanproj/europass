import { Dialog } from '../../components/Dialog/Dialog';
import styles from './ScoreDialog.module.css';
import type { PassportScore } from './score';

const fmt = new Intl.NumberFormat('ko-KR');

interface Props {
  open: boolean;
  score: PassportScore;
  onClose: () => void;
}

/** 여권 점수 계산표: 항목마다 "개수 × 점수 = 합계", 맨 아래 총점 */
export function ScoreDialog({ open, score, onClose }: Props) {
  return (
    <Dialog open={open} title="여권 점수" onClose={onClose}>
      <p className={styles.lead}>어디 사는지와 상관없이 같은 기준으로 셉니다. 친구와 점수를 비교해 보세요.</p>
      <table className={styles.table}>
        <caption className={styles.caption}>여권 점수 계산</caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">계산</th>
            <th scope="col">점수</th>
          </tr>
        </thead>
        <tbody>
          {score.lines.map((l) => (
            <tr key={l.id} className={l.count === 0 ? styles.zero : undefined}>
              <th scope="row">{l.label}</th>
              <td className={styles.calc}>
                {fmt.format(l.count)}
                {l.unit} × {l.points}
              </td>
              <td className={styles.sub}>{fmt.format(l.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              합계
            </th>
            <td className={styles.total}>{fmt.format(score.total)}</td>
          </tr>
        </tfoot>
      </table>
      <ul className={styles.notes}>
        <li>숨은 명소는 금색 도장 도시예요. 도시 점수에 10점이 더해져요.</li>
        <li>유럽에서 보낸 날은 머문 기간을 모두 더하고, 겹치는 날은 한 번만 세요.</li>
        <li>같은 도시를 다시 가면 방문마다 5점이에요.</li>
      </ul>
    </Dialog>
  );
}
