import { useLiveQuery } from 'dexie-react-hooks';
import { navigate } from '../../app/nav';
import { db } from '../../db/db';
import { byNewest } from '../../db/selectors';
import { useBlobUrl } from '../collection/useBlobUrl';
import styles from './ProfileButton.module.css';
import { useProfile } from './profile';

/** 우상단 프로필 버튼: 가장 최근 여행 사진, 없으면 이름 첫 글자 */
export function ProfileButton() {
  const profile = useProfile();
  const photo = useLiveQuery(async () => {
    const visits = await db.visits.toArray();
    return visits.filter((v) => v.photos.length > 0).sort(byNewest)[0]?.photos[0];
  }, []);
  const url = useBlobUrl(photo);
  return (
    <button
      type="button"
      className={styles.button}
      aria-label="프로필"
      onClick={() => navigate({ kind: 'profile' })}
    >
      {url ? (
        <img src={url} alt="" className={styles.photo} />
      ) : (
        <span className={styles.initial} aria-hidden>
          {[...profile.name.trim()][0] ?? ''}
        </span>
      )}
    </button>
  );
}
