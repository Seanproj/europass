import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Flag } from '../../components/Flag/Flag';
import { CITIES, COUNTRIES, getCity, getCountry } from '../../data/cities';
import { db } from '../../db/db';
import type { Profile } from '../../db/types';
import { buildIndex, searchCities } from '../checkin/search';
import { Dialog } from '../../components/Dialog/Dialog';
import styles from './ProfileEditor.module.css';
import ui from '../../components/Dialog/ui.module.css';
import { saveProfile } from './profile';

let index: ReturnType<typeof buildIndex> | undefined;

/** 이름과 홈 도시 편집. 홈 도시는 이동거리 계산과 "가까운 도시" 기준 */
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
    index ??= buildIndex(CITIES, COUNTRIES);
    return searchCities(index, query, 8);
  }, [query]);
  const homeCity = getCity(home);

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
        홈 도시
      </label>
      {homeCity && (
        <p className={styles.current}>
          <Flag code={homeCity.country} size={20} visited alt="" />
          <span>
            {homeCity.name.ko} · {getCountry(homeCity.country)?.name.ko}
          </span>
        </p>
      )}
      <input
        id="profile-home"
        className={ui.input}
        type="search"
        placeholder="다른 도시 검색"
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className={styles.hits} aria-label="홈 도시 후보">
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
