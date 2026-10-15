import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Flag } from '../../components/Flag/Flag';
import { CITIES, getCountry } from '../../data/cities';
import { db } from '../../db/db';
import type { Profile } from '../../db/types';
import { buildIndex, searchCities } from '../checkin/search';
import { HOME_KOREA, HOME_NONE, homePlace } from '../../data/home';
import { Dialog } from '../../components/Dialog/Dialog';
import styles from './ProfileEditor.module.css';
import ui from '../../components/Dialog/ui.module.css';
import { saveProfile } from './profile';

let index: ReturnType<typeof buildIndex> | undefined;

/** 이름과 출발지 편집. 출발지는 선택: 정하지 않음 · 한국 · 유럽 도시 하나 ("가까운 도시"·도시까지 거리의 기준) */
export function ProfileEditor({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: Profile;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} title="프로필 편집" onClose={onClose}>
      {/* 열 때마다 지금 값으로 새로 시작 */}
      {open && <EditorForm profile={profile} onDone={onClose} />}
    </Dialog>
  );
}

function EditorForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [name, setName] = useState(profile.name);
  const [home, setHome] = useState(profile.homeCityId);
  const [query, setQuery] = useState('');
  const hits = useMemo(() => {
    index ??= buildIndex(CITIES);
    return searchCities(index, query, 8);
  }, [query]);
  const current = homePlace(home);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void saveProfile(db, { name, homeCityId: home }).then(onDone);
      }}
    >
      <label className={ui.label} htmlFor="profile-name">
        이름
      </label>
      <input
        id="profile-name"
        className={ui.input}
        value={name}
        maxLength={24}
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
      />

      <label className={ui.label} htmlFor="profile-home">
        출발지 (선택)
      </label>
      <p className={styles.current}>
        {current ? (
          <>
            <Flag code={current.country} size={20} visited alt="" />
            <span>
              {current.name}
              {current.city && ` · ${getCountry(current.country)?.name.ko}`}
            </span>
          </>
        ) : (
          <span className={styles.none}>정하지 않음</span>
        )}
      </p>
      <ul className={styles.hits} aria-label="출발지 빠른 선택">
        {[
          { id: HOME_NONE, label: '정하지 않음', flag: null },
          { id: HOME_KOREA, label: '한국', flag: 'KR' },
        ].map((o) => (
          <li key={o.id || 'none'}>
            <button
              type="button"
              className={styles.hit}
              aria-pressed={home === o.id}
              onClick={() => {
                setHome(o.id);
                setQuery('');
              }}
            >
              {o.flag ? <Flag code={o.flag} size={20} visited alt="" /> : <span className={styles.noFlag} />}
              <span className={styles.hitName}>{o.label}</span>
              <span className={styles.hitCountry} />
              {home === o.id && <Check aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
      <input
        id="profile-home"
        className={ui.input}
        type="search"
        placeholder="유럽 도시 검색"
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
                aria-pressed={city.id === home}
                onClick={() => {
                  setHome(city.id);
                  setQuery('');
                }}
              >
                <Flag code={city.country} size={20} visited alt="" />
                <span className={styles.hitName}>{city.name.ko}</span>
                <span className={styles.hitCountry}>{getCountry(city.country)?.name.ko}</span>
                {city.id === home && <Check aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button type="button" className={ui.button} onClick={onDone}>
          취소
        </button>
        <button type="submit" className={ui.primary}>
          저장
        </button>
      </div>
    </form>
  );
}
