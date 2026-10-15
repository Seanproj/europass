import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, LocateFixed, Loader2, Search } from 'lucide-react';
import styles from './PassportIntro.module.css';
import { useUI } from '../../app/store';
import { Flag } from '../../components/Flag/Flag';
import { CITIES, COUNTRIES, getCountry } from '../../data/cities';
import { HOME_KOREA, HOME_NONE, homePlace } from '../../data/home';
import { db } from '../../db/db';
import { stampDate, todayISO } from '../../lib/date';
import { buildIndex, cityNear, searchCities } from '../checkin/search';
import { playStampSound } from '../checkin/stampSound';
import { useCheckIn } from '../checkin/useCheckIn';
import { useGeolocation } from '../checkin/useGeolocation';
import { DEFAULT_PROFILE, saveProfile } from '../profile/profile';
import { markIntroSeen } from './introFlag';

type Step = 'cover' | 'id' | 'issued' | 'first';

let index: ReturnType<typeof buildIndex> | undefined;

/** 발급 도장이 찍힌 뒤 다음 장으로 넘어가기까지 */
const ISSUED_MS = 1300;

/**
 * 처음 쓰는 사람의 여권 발급 오프닝 (한 번만): 표지 → 신원 페이지(이름·출발지, 모두 선택) → "발급" 도장 →
 * 첫 도장 찍기(현재 위치 또는 검색). 어디서든 건너뛸 수 있다
 */
export function PassportIntro() {
  const [step, setStep] = useState<Step>('cover');
  const [name, setName] = useState('');
  const [home, setHome] = useState(HOME_NONE);
  const checkIn = useCheckIn();
  const titleId = useId();

  // 장이 바뀌면 그 장의 제목으로 포커스 (화면 낭독기가 새 장을 읽게)
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [step]);

  useEffect(() => {
    if (step !== 'issued') return;
    playStampSound();
    navigator.vibrate?.(12);
    const t = setTimeout(() => setStep('first'), ISSUED_MS);
    return () => clearTimeout(t);
  }, [step]);

  /** 오프닝을 닫는다 (다시 보이지 않게 기록) */
  const finish = (then?: () => void) => {
    markIntroSeen();
    useUI.setState({ intro: false });
    then?.();
  };

  const issue = async () => {
    await saveProfile(db, { name: name.trim() || DEFAULT_PROFILE.name, homeCityId: home });
    setStep('issued');
  };

  return (
    <motion.div
      className={styles.layer}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
      }}
    >
      <button type="button" className={styles.skip} onClick={() => finish()}>
        건너뛰기
      </button>
      <div className={styles.stage}>
        <AnimatePresence mode="wait" initial={false}>
          {step === 'cover' ? (
            <motion.button
              key="cover"
              type="button"
              className={styles.cover}
              onClick={() => setStep('id')}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ rotateY: -95, opacity: 0.6, transition: { duration: 0.45, ease: [0.4, 0, 0.6, 1] } }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className={styles.coverTop}>EUROPEAN TRAVEL</span>
              <Emblem />
              <h1 id={titleId} ref={headingRef} tabIndex={-1} className={styles.coverTitle}>
                EURO
                <br />
                PASSPORT
              </h1>
              <span className={styles.coverHint}>눌러서 여권 받기</span>
            </motion.button>
          ) : (
            <motion.section
              key="page"
              className={styles.page}
              initial={{ opacity: 0, rotateY: 40 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p className={styles.pageTop}>EURO PASSPORT · 여권</p>
              {step === 'first' ? (
                <FirstStampStep
                  headingRef={headingRef}
                  titleId={titleId}
                  onStamp={(cityId) => finish(() => void checkIn(cityId))}
                  onSearch={() => finish(() => useUI.getState().setSearchOpen(true))}
                  onLater={() => finish()}
                />
              ) : (
                <IdStep
                  headingRef={headingRef}
                  titleId={titleId}
                  name={name}
                  home={home}
                  issued={step === 'issued'}
                  onName={setName}
                  onHome={setHome}
                  onIssue={() => void issue()}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface StepProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  titleId: string;
}

function IdStep({
  headingRef,
  titleId,
  name,
  home,
  issued,
  onName,
  onHome,
  onIssue,
}: StepProps & {
  name: string;
  home: string;
  issued: boolean;
  onName: (v: string) => void;
  onHome: (v: string) => void;
  onIssue: () => void;
}) {
  const [query, setQuery] = useState('');
  const [europe, setEurope] = useState(false);
  const hits = useMemo(() => {
    if (!europe || !query.trim()) return [];
    index ??= buildIndex(CITIES, COUNTRIES);
    return searchCities(index, query, 5);
  }, [europe, query]);
  const place = homePlace(home);
  const today = todayISO();

  return (
    <div className={styles.id}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
        여권을 발급할게요
      </h2>
      <p className={styles.lead}>모두 선택이에요. 나중에 프로필에서 바꿀 수 있어요.</p>

      <label className={styles.label} htmlFor="intro-name">
        이름
      </label>
      <input
        id="intro-name"
        className={styles.input}
        value={name}
        maxLength={24}
        placeholder={DEFAULT_PROFILE.name}
        autoComplete="nickname"
        disabled={issued}
        onChange={(e) => onName(e.target.value)}
      />

      <span className={styles.label} id="intro-home">
        출발지
      </span>
      <div className={styles.chips} role="group" aria-labelledby="intro-home">
        {[
          { id: HOME_NONE, label: '정하지 않음' },
          { id: HOME_KOREA, label: '한국' },
        ].map((o) => (
          <button
            key={o.id || 'none'}
            type="button"
            className={styles.chip}
            aria-pressed={!europe && home === o.id}
            disabled={issued}
            onClick={() => {
              setEurope(false);
              onHome(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.chip}
          aria-pressed={europe}
          disabled={issued}
          onClick={() => setEurope(true)}
        >
          {europe && place?.city ? place.name : '유럽 도시'}
        </button>
      </div>
      {europe && !issued && (
        <>
          <input
            className={styles.input}
            type="search"
            aria-label="출발지 도시 검색"
            placeholder="도시 이름"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          {hits.length > 0 && (
            <ul className={styles.hits} aria-label="출발지 후보">
              {hits.map(({ city }) => (
                <li key={city.id}>
                  <button
                    type="button"
                    className={styles.hit}
                    aria-pressed={home === city.id}
                    onClick={() => {
                      onHome(city.id);
                      setQuery('');
                    }}
                  >
                    <Flag code={city.country} size={18} visited alt="" />
                    <span>{city.name.ko}</span>
                    <small>{getCountry(city.country)?.name.ko}</small>
                    {home === city.id && <Check aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <dl className={styles.meta}>
        <div>
          <dt>발급일</dt>
          <dd>{stampDate(today)}</dd>
        </div>
        <div>
          <dt>여권 번호</dt>
          <dd>EP-{today.replaceAll('-', '')}</dd>
        </div>
      </dl>

      <div className={styles.issueRow}>
        <button type="button" className={styles.primary} onClick={onIssue} disabled={issued}>
          {issued ? '발급 완료' : '여권 발급'}
        </button>
        <AnimatePresence>
          {issued && (
            <motion.div
              className={styles.seal}
              initial={{ scale: 1.8, opacity: 0, rotate: -18 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.35 }}
              role="img"
              aria-label="발급 도장"
            >
              <IssueSeal date={stampDate(today)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FirstStampStep({
  headingRef,
  titleId,
  onStamp,
  onSearch,
  onLater,
}: StepProps & { onStamp: (cityId: string) => void; onSearch: () => void; onLater: () => void }) {
  const geo = useGeolocation();
  const near = geo.state.status === 'found' ? cityNear(CITIES, geo.state.lat, geo.state.lon, 50) : null;
  return (
    <div className={styles.first}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
        첫 도장을 찍을 차례예요
      </h2>
      <p className={styles.lead}>도장을 찍으면 그 도시 둘레의 안개가 걷혀요.</p>

      {near ? (
        <div className={styles.near} aria-live="polite">
          <Flag code={near.city.country} size={28} visited alt="" />
          <p>
            지금 <b>{near.city.name.ko}</b> 근처에 계시네요
          </p>
          <button type="button" className={styles.primary} onClick={() => onStamp(near.city.id)}>
            여기서 첫 도장 찍기
          </button>
        </div>
      ) : (
        geo.state.status !== 'hidden' && (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={geo.locate}
              disabled={geo.state.status === 'locating'}
            >
              {geo.state.status === 'locating' ? (
                <Loader2 aria-hidden className={styles.spin} />
              ) : (
                <LocateFixed aria-hidden />
              )}
              현재 위치로 찾기
            </button>
            {geo.state.status === 'found' && (
              <p className={styles.note} aria-live="polite">
                50km 안에 등록된 도시가 없어요. 다녀온 도시를 검색해 보세요
              </p>
            )}
            {geo.state.status === 'error' && (
              <p className={styles.note} aria-live="polite">
                위치를 찾지 못했어요. 도시를 검색해 보세요
              </p>
            )}
          </>
        )
      )}
      <button type="button" className={styles.secondary} onClick={onSearch}>
        <Search aria-hidden />
        다녀온 도시 검색
      </button>
      <button type="button" className={styles.link} onClick={onLater}>
        나중에 할게요
      </button>
    </div>
  );
}

/** 표지 문양: 별 12개 원 */
function Emblem() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return [50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30] as const;
  });
  return (
    <svg className={styles.emblem} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {stars.map(([x, y], i) => (
        <path key={i} d={star(x, y, 5)} fill="currentColor" />
      ))}
    </svg>
  );
}

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** 발급 도장: 이중 원 + ISSUED + 날짜 (도장 글자는 JetBrains Mono) */
function IssueSeal({ date }: { date: string }) {
  return (
    <svg viewBox="0 0 120 120" className={styles.sealSvg} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle
        cx="60"
        cy="60"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 3"
      />
      <text x="60" y="44" textAnchor="middle" className={styles.sealSmall}>
        EURO PASSPORT
      </text>
      <text x="60" y="67" textAnchor="middle" className={styles.sealBig}>
        ISSUED
      </text>
      <text x="60" y="86" textAnchor="middle" className={styles.sealSmall}>
        {date}
      </text>
    </svg>
  );
}
