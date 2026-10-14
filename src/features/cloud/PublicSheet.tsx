import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { navigate } from '../../app/nav';
import { HOME, useUI } from '../../app/store';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity } from '../../data/cities';
import { dateRange } from '../../lib/date';
import { loadBackend } from '../../cloud/backend';
import type { PublicProfileData } from '../../cloud/types';
import { BottomSheet } from '../collection/BottomSheet';
import { recentStamps } from '../share/cardData';
import { Badges } from '../profile/Badges';
import { evaluateBadges } from '../profile/badges';
import { profileStats } from '../profile/stats';
import styles from './PublicSheet.module.css';
import { toVisits } from './publicVisits';

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; data: PublicProfileData };

const num = new Intl.NumberFormat('ko-KR');

/**
 * 다른 사람의 공개 프로필 (?u=handle). 지도는 그 사람의 안개·도장으로 바뀌고, 이 시트는 읽기 전용.
 * 닫으면 내 지도로 돌아간다
 */
export function PublicSheet({ handle }: { handle: string }) {
  const snap = useUI((s) => s.sheetSnap);
  const setSnap = useUI((s) => s.setSheetSnap);
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let alive = true;
    const backend = loadBackend();
    if (!backend) {
      void Promise.resolve().then(() => alive && setLoad({ state: 'missing' }));
      return;
    }
    void backend
      .then((b) => b.fetchPublicProfile(handle))
      .catch(() => null)
      .then((data) => {
        if (!alive) return;
        setLoad(data ? { state: 'ready', data } : { state: 'missing' });
        if (data) {
          useUI.setState({ publicView: { visits: toVisits(data), homeCityId: data.homeCityId } });
          if (useUI.getState().sheetSnap === 'peek') setSnap('half');
        }
      });
    return () => {
      alive = false;
      useUI.setState({ publicView: null });
    };
  }, [handle, setSnap]);

  const name = load.state === 'ready' ? load.data.name : handle;
  const header = (
    <div className={styles.header}>
      <span className={styles.title}>
        <span>
          <b>{name}</b>의 유럽
        </span>
        <span className={styles.badge}>읽기 전용</span>
      </span>
      <button
        type="button"
        className={styles.close}
        aria-label="내 지도로 돌아가기"
        onClick={() => navigate(HOME, { replace: true })}
      >
        <X aria-hidden />
      </button>
    </div>
  );

  return (
    <BottomSheet label={`${name}의 공개 프로필`} snap={snap} onSnapChange={setSnap} header={header}>
      {load.state === 'loading' && <p className={styles.empty}>불러오는 중…</p>}
      {load.state === 'missing' && (
        <p className={styles.empty}>
          공개 프로필을 찾을 수 없어요. 주소가 맞는지, 공개를 켰는지 확인해 주세요.
        </p>
      )}
      {load.state === 'ready' && <PublicBody data={load.data} />}
    </BottomSheet>
  );
}

function PublicBody({ data }: { data: PublicProfileData }) {
  const visits = useMemo(() => toVisits(data), [data]);
  const stats = useMemo(() => profileStats(visits, data.homeCityId), [visits, data.homeCityId]);
  const badges = useMemo(() => evaluateBadges(visits), [visits]);
  const stamps = useMemo(() => recentStamps(visits, Infinity), [visits]);
  const log = data.visits
    .filter((v) => v.note || v.photos.length)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={styles.body}>
      <p className={styles.meta}>
        도시 <b>{num.format(stats.cities)}</b> · 나라 <b>{num.format(stats.countries)}</b> · 이동거리{' '}
        <b>{num.format(stats.km)}</b>km
      </p>
      <Badges states={badges} />
      <section aria-labelledby="public-stamps" className={styles.section}>
        <h2 id="public-stamps" className={styles.h2}>
          도장 {stamps.length}개
        </h2>
        <ul className={styles.stamps}>
          {stamps.map((s) => (
            <li key={s.city.id}>
              <Stamp city={s.city} visit={s.visit} nth={s.nth} size={72} decorative />
              <span>{s.city.name.ko}</span>
            </li>
          ))}
        </ul>
      </section>
      {log.length > 0 && (
        <section aria-labelledby="public-log" className={styles.section}>
          <h2 id="public-log" className={styles.h2}>
            기록
          </h2>
          <ul className={styles.log}>
            {log.map((v) => (
              <li key={v.id}>
                <span className={styles.logHead}>
                  <b>{getCity(v.cityId)?.name.ko ?? v.cityId}</b> {dateRange(v.date, v.endDate ?? undefined)}
                </span>
                {v.note && <p className={styles.note}>{v.note}</p>}
                {v.photos.length > 0 && (
                  <div className={styles.photos}>
                    {v.photos.slice(0, 4).map((p) => (
                      <PublicPhoto key={p} path={p} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 공개한 사진 (보일 때 받아 온다) */
function PublicPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    void loadBackend()
      ?.then((b) => b.fetchPublicPhoto(path))
      .then((blob) => {
        made = URL.createObjectURL(blob);
        if (alive) setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [path]);
  return url ? (
    <img className={styles.photo} src={url} alt="" />
  ) : (
    <span className={styles.photo} aria-hidden />
  );
}
