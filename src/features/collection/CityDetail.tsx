import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import styles from './CityDetail.module.css';
import { Flag } from '../../components/Flag/Flag';
import { Stamp } from '../../components/Stamp/Stamp';
import { getCity, getCountry } from '../../data/cities';
import { db } from '../../db/db';
import type { Visit } from '../../db/types';
import { koreanDate, todayISO } from '../../lib/date';

interface Props {
  cityId: string;
  onCheckIn: (cityId: string) => void;
  onClose: () => void;
}

/** 도시 상세 (임시, Phase 5에서 방문 타임라인·도장 스택으로 확장) */
export function CityDetail({ cityId, onCheckIn, onClose }: Props) {
  const city = getCity(cityId);
  const visits = useLiveQuery(
    async () => (await db.visits.where('cityId').equals(cityId).toArray()).sort(byLatest),
    [cityId],
  );
  if (!city || !visits) return null;
  const latest = visits[0];
  const country = getCountry(city.country);

  return (
    <section className={styles.detail} aria-label={`${city.name.ko} 상세`}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
        <X aria-hidden />
      </button>
      <div className={styles.stamps}>
        {/* 이전 방문 도장이 아래로 겹겹이 (최대 2장) */}
        {visits
          .slice(1, 3)
          .reverse()
          .map((v) => (
            <Stamp key={v.id} city={city} visit={v} size={128} className={styles.under} />
          ))}
        <Stamp city={city} visit={latest ?? null} size={128} className={styles.top} />
      </div>
      <h2 className={styles.name}>{city.name.ko}</h2>
      <p className={styles.meta}>
        <Flag code={city.country} size={18} visited={!!latest} alt="" />
        {country?.name.ko}
        {latest && (
          <>
            {' · '}
            {koreanDate(latest.date)}
            {visits.length > 1 && ` · ${visits.length}번 방문`}
          </>
        )}
      </p>
      {latest ? (
        <VisitActions visit={latest} />
      ) : (
        <button type="button" className={styles.primary} onClick={() => onCheckIn(city.id)}>
          여기 다녀왔어요
        </button>
      )}
    </section>
  );
}

const byLatest = (a: Visit, b: Visit) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

/** 선택 사항: 사진 · 한 줄 · 날짜. 무시해도 되는 조용한 텍스트 버튼 */
function VisitActions({ visit }: { visit: Visit }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [editingNote, setEditingNote] = useState(false);
  const update = (patch: Partial<Visit>) => db.visits.update(visit.id, { ...patch, updatedAt: Date.now() });

  return (
    <>
      {visit.note && !editingNote && <p className={styles.note}>{visit.note}</p>}
      {editingNote && (
        <input
          className={styles.noteInput}
          defaultValue={visit.note}
          autoFocus
          maxLength={140}
          placeholder="한 줄 남기기"
          aria-label="한 줄 메모"
          enterKeyHint="done"
          onBlur={(e) => {
            void update({ note: e.target.value.trim() });
            setEditingNote(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditingNote(false);
          }}
        />
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.text} onClick={() => fileRef.current?.click()}>
          사진 추가{visit.photos.length > 0 && ` (${visit.photos.length})`}
        </button>
        <button type="button" className={styles.text} onClick={() => setEditingNote(true)}>
          {visit.note ? '한 줄 고치기' : '한 줄 남기기'}
        </button>
        <button
          type="button"
          className={styles.text}
          onClick={() => {
            const el = dateRef.current;
            if (!el) return;
            if (typeof el.showPicker === 'function') el.showPicker();
            else el.click();
          }}
        >
          날짜 변경
        </button>
      </div>
      <input
        ref={fileRef}
        className={styles.hidden}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) void update({ photos: [...visit.photos, ...files] });
          e.target.value = '';
        }}
      />
      <input
        ref={dateRef}
        className={styles.hidden}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={visit.date}
        max={todayISO()}
        onChange={(e) => {
          if (e.target.value) void update({ date: e.target.value });
        }}
      />
    </>
  );
}
