import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { goBack } from '../../app/nav';
import { Flag } from '../../components/Flag/Flag';
import { getCity } from '../../data/cities';
import { db } from '../../db/db';
import type { Visit } from '../../db/types';
import { Badges } from './Badges';
import { evaluateBadges } from './badges';
import { ProfileEditor } from './ProfileEditor';
import styles from './ProfilePage.module.css';
import { Settings } from './Settings';
import { profileStats, timelineByMonth } from './stats';
import { Timeline } from './Timeline';
import { useProfile } from './profile';

const EMPTY: Visit[] = [];
const fmt = new Intl.NumberFormat('ko-KR');

/** 우상단 프로필 버튼으로 여는 전체 화면 페이지 하나 (탭 없이 위에서 아래로) */
export function ProfilePage() {
  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const stats = useMemo(() => profileStats(visits, profile.homeCityId), [visits, profile.homeCityId]);
  const badges = useMemo(() => evaluateBadges(visits), [visits]);
  const months = useMemo(() => timelineByMonth(visits), [visits]);
  const home = getCity(profile.homeCityId);

  // 열리면 제목으로 포커스를 옮겨 스크린리더가 새 화면을 읽게
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <motion.main
      className={styles.page}
      aria-labelledby="profile-name"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className={styles.inner}>
        <div className={styles.bar}>
          <button type="button" className={styles.back} onClick={goBack} aria-label="지도로 돌아가기">
            <ChevronLeft aria-hidden />
          </button>
        </div>

        <header className={styles.header}>
          <div className={styles.who}>
            <h1 id="profile-name" ref={headingRef} tabIndex={-1} className={styles.name}>
              {profile.name}
            </h1>
            {home && (
              <p className={styles.home}>
                <Flag code={home.country} size={18} visited alt="" />
                <span>{home.name.ko}에서 출발</span>
              </p>
            )}
          </div>
          <button type="button" className={styles.edit} onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            편집
          </button>
        </header>

        <dl className={styles.numbers}>
          <div>
            <dt>도시</dt>
            <dd>{fmt.format(stats.cities)}</dd>
          </div>
          <div>
            <dt>나라</dt>
            <dd>{fmt.format(stats.countries)}</dd>
          </div>
          <div>
            <dt>이동거리</dt>
            <dd>
              {fmt.format(stats.km)}
              <small>km</small>
            </dd>
          </div>
        </dl>
        <p className={styles.summary}>
          {stats.visits === 0 ? (
            '아직 방문 기록이 없어요'
          ) : (
            <>
              총 {fmt.format(stats.visits)}번의 방문
              {stats.top.length > 0 && (
                <>
                  {' · 가장 많이 간 도시 '}
                  {stats.top.map((t) => `${getCity(t.cityId)?.name.ko ?? t.cityId}(${t.count})`).join(' · ')}
                </>
              )}
            </>
          )}
        </p>

        <Badges states={badges} />
        <Timeline months={months} />
        <Settings profile={profile} visitCount={visits.length} onEditProfile={() => setEditing(true)} />
      </div>
      <ProfileEditor open={editing} profile={profile} onClose={() => setEditing(false)} />
    </motion.main>
  );
}
