import styles from './Flag.module.css';
import { getCountry } from '../../data/cities';

// flag-icons의 1x1 SVG. 데이터셋에 있는 나라만 번들에 넣는다 (countries.json과 목록을 맞출 것)
const FLAG_URLS = import.meta.glob<string>(
  '../../../node_modules/flag-icons/flags/1x1/{ad,al,at,ba,be,bg,ch,cy,cz,de,dk,ee,es,fi,fr,gb,gr,hr,hu,ie,is,it,li,lt,lu,lv,mc,me,mk,mt,nl,no,pl,pt,ro,rs,se,si,sk,sm,xk}.svg',
  { eager: true, query: '?url', import: 'default' },
);

const urlOf = (code: string) =>
  FLAG_URLS[`../../../node_modules/flag-icons/flags/1x1/${code.toLowerCase()}.svg`];

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
