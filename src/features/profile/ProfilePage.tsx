import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Info, Pencil, Share2, Sparkles } from 'lucide-react';
import { goBack, navigate } from '../../app/nav';
import { wrapYearFor } from '../share/cardData';
import { Flag } from '../../components/Flag/Flag';
import { getCity } from '../../data/cities';
import { homePlace } from '../../data/home';
import { db } from '../../db/db';
import type { Visit } from '../../db/types';
import { Badges } from './Badges';
import { Passport } from './Passport';
import { passport } from './passport';
import { bookPages } from './passportBook';
import { evaluateBadges } from './badges';
import { ProfileEditor } from './ProfileEditor';
import styles from './ProfilePage.module.css';
import { Settings } from './Settings';
import { profileStats, timelineByMonth } from './stats';
import { Timeline } from './Timeline';
import { ScoreDialog } from './ScoreDialog';
import { passportScore } from './score';
import { getProfile, useProfile } from './profile';
import { ShareDialog, type ShareFormat } from '../share/ShareDialog';
import { makeSummaryCard } from '../share/share';
import { todayISO } from '../../lib/date';

const EMPTY: Visit[] = [];

const summaryFormat = (id: 'feed' | 'story', label: string, aspect: number): ShareFormat => ({
  id,
  label,
  aspect,
  fileName: `euro-passport-${id}-${todayISO()}.png`,
  make: async () => makeSummaryCard(id, await db.visits.toArray(), await getProfile(db)),
});
const SUMMARY_FORMATS = [
  summaryFormat('feed', '피드 4:5', 4 / 5),
  summaryFormat('story', '스토리 9:16', 9 / 16),
];
const fmt = new Intl.NumberFormat('ko-KR');

/** 우상단 프로필 버튼으로 여는 전체 화면 페이지 하나 (탭 없이 위에서 아래로) */
export function ProfilePage() {
  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const stats = useMemo(() => profileStats(visits), [visits]);
  const score = useMemo(() => passportScore(visits), [visits]);
  const badges = useMemo(() => evaluateBadges(visits), [visits]);
  const months = useMemo(() => timelineByMonth(visits), [visits]);
  const book = useMemo(() => passport(visits), [visits]);
  const pages = useMemo(() => bookPages(visits), [visits]);
  const home = homePlace(profile.homeCityId);
  // 연말 결산 배너: 12월 1일 ~ 1월 31일에만
  const wrapYear = wrapYearFor(todayISO());

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

        {wrapYear !== null && (
          <button
            type="button"
            className={styles.wrap}
            onClick={() => navigate({ kind: 'wrap', year: wrapYear })}
          >
            <Sparkles aria-hidden />
            <span className={styles.wrapText}>
              <b>My Euro Year {wrapYear}</b>
              <span>올해의 여행을 다섯 장으로</span>
            </span>
            <ChevronRight aria-hidden />
          </button>
        )}

        <header className={styles.header}>
          <div className={styles.who}>
            <h1 id="profile-name" ref={headingRef} tabIndex={-1} className={styles.name}>
              {profile.name}
            </h1>
            {home && (
              <p className={styles.home}>
                <Flag code={home.country} size={18} visited alt="" />
                <span>{home.name}에서 출발</span>
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.edit} onClick={() => setSharing(true)}>
              <Share2 aria-hidden />
              <span className={styles.editLabel}>공유</span>
            </button>
            <button type="button" className={styles.edit} onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              <span className={styles.editLabel}>편집</span>
            </button>
          </div>
        </header>

        {/* 어디 사는지와 상관없이 친구와 비교할 수 있는 숫자 3개. 여권 점수는 눌러서 계산을 본다 */}
        <dl className={styles.numbers}>
          <div className={styles.scoreCell}>
            <dt>
              여권 점수
              <Info aria-hidden className={styles.info} />
            </dt>
            <dd>
              <button
                type="button"
                className={styles.scoreButton}
                onClick={() => setScoreOpen(true)}
                aria-label={`여권 점수 ${fmt.format(stats.score)}점, 계산 보기`}
              >
                {fmt.format(stats.score)}
              </button>
            </dd>
          </div>
          <div>
            {/* 좁으면 "유럽에서 / 보낸 날"로 끊기게 */}
            <dt>유럽에서 보낸{'\u00a0'}날</dt>
            <dd>
              {fmt.format(stats.days)}
              <small>일</small>
            </dd>
          </div>
          <div>
            <dt>국기 조각</dt>
            <dd>
              {fmt.format(stats.pieces.painted)}
              <small>/{fmt.format(stats.pieces.total)}</small>
            </dd>
          </div>
        </dl>
        <p className={styles.summary}>
          {stats.visits === 0 ? (
            '아직 방문 기록이 없어요'
          ) : (
            <>
              도시 {fmt.format(stats.cities)}곳 · 나라 {fmt.format(stats.countries)}개 · 총{' '}
              {fmt.format(stats.visits)}번의 방문
              {stats.top.length > 0 && (
                <>
                  {' · 가장 많이 간 도시 '}
                  {stats.top.map((t) => `${getCity(t.cityId)?.name.ko ?? t.cityId}(${t.count})`).join(' · ')}
                </>
              )}
            </>
          )}
        </p>

        <Passport data={book} pages={pages} />
        <Badges states={badges} />
        <Timeline months={months} />
        <Settings profile={profile} visitCount={visits.length} onEditProfile={() => setEditing(true)} />
      </div>
      <ScoreDialog open={scoreOpen} score={score} onClose={() => setScoreOpen(false)} />
      <ProfileEditor open={editing} profile={profile} onClose={() => setEditing(false)} />
      <ShareDialog
        open={sharing}
        title="공유 카드"
        formats={SUMMARY_FORMATS}
        onClose={() => setSharing(false)}
      />
    </motion.main>
  );
}
