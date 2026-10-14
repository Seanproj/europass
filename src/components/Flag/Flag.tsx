import styles from './Flag.module.css';
import { getCountry } from '../../data/cities';
import { flagUrl as urlOf } from './flagUrl';

interface Props {
  /** ISO 3166-1 alpha-2 (코소보는 XK) */
  code: string;
  /** 지름(px) */
  size?: number;
  /** 방문한 나라만 원래 색. 아니면 흑백 + 반투명 */
  visited?: boolean;
  /** 대체 텍스트. 기본은 나라 이름, 옆에 이름이 같이 보이면 ''로 장식 처리 */
  alt?: string;
}

/** 원형 국기 */
export function Flag({ code, size = 24, visited = false, alt }: Props) {
  const url = urlOf(code);
  const label = alt ?? getCountry(code)?.name.ko ?? code;
  const className = [styles.flag, visited ? '' : styles.unvisited].filter(Boolean).join(' ');
  if (!url) {
    return (
      <span
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label={label || undefined}
      >
        {code}
      </span>
    );
  }
  return <img className={className} src={url} width={size} height={size} alt={label} draggable={false} />;
}
