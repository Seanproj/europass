import { useMemo, useRef, useState } from 'react';
import { Camera, MoreHorizontal, Plus, X } from 'lucide-react';
import styles from './CityView.module.css';
import { Flag } from '../../components/Flag/Flag';
import { Stamp } from '../../components/Stamp/Stamp';
import { CITIES, getCity, getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { db } from '../../db/db';
import { stayNights, totalStayDays } from '../../db/selectors';
import type { Visit } from '../../db/types';
import { dateRange, dotMonth, koreanDate, todayISO } from '../../lib/date';
import { cityNear, distanceKm } from '../checkin/search';
import { MAX_PHOTOS, type PhotoHints } from './photos';
import { PhotoViewer, type ViewerPhoto } from './PhotoViewer';
import { useBlobUrl } from './useBlobUrl';
import { reportWriteError, warnIfStorageFull } from '../../app/storageWatch';
import { addPhotos, deleteVisit, NOTE_MAX, normalizeRange, removePhoto, updateVisit } from './visitEdits';

interface Props {
  cityId: string;
  /** 이 도시의 방문 (최신순) */
  visits: Visit[];
  homeId: string | undefined;
  onCheckIn: (cityId: string, date?: string) => void;
}

/** 도시 상세: 도장 스택 + 방문 타임라인 (concept.html 04) */
export function CityView({ cityId, visits, homeId, onCheckIn }: Props) {
  const city = getCity(cityId);
  const [open, setOpen] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ start: number } | null>(null);
  const photos = useMemo<ViewerPhoto[]>(
    () =>
      visits.flatMap((v, i) =>
        v.photos.map((blob) => ({
          blob,
          caption: `${visits.length - i}번째 · ${dateRange(v.date, v.endDate)}`,
        })),
      ),
    [visits],
  );
  if (!city) return null;
  const country = getCountry(city.country);
  const home = homeId && homeId !== cityId ? getCity(homeId) : undefined;
  const photoIndex = (visit: Visit, i: number) => {
    let n = 0;
    for (const v of visits) {
      if (v.id === visit.id) return n + i;
      n += v.photos.length;
    }
    return 0;
  };

  return (
    <section className={styles.city} aria-label={`${city.name.ko} 상세`}>
      <StampStack city={city} visits={visits} />
      <h2 className={styles.name}>{city.name.ko}</h2>
      <p className={styles.meta}>
        <Flag code={city.country} size={18} visited={visits.length > 0} alt="" />
        {country?.name.ko}
        {visits.length === 1 && ` · ${koreanDate(visits[0]!.date)}`}
        {visits.length > 1 && ` · ${visits.length}번 방문 · 총 ${totalStayDays(visits)}일`}
      </p>

      {visits.length > 1 && (
        <ul className={styles.chips}>
          <li>
            첫 방문 <b>{dotMonth(visits[visits.length - 1]!.date)}</b>
          </li>
          <li>
            최근 <b>{dotMonth(visits[0]!.date)}</b>
          </li>
          <li>
            사진 <b>{photos.length}</b>
          </li>
        </ul>
      )}
      {visits.length === 1 && home && (
        <p className={styles.hint}>
          {home.name.ko}에서 <b>{Math.round(distanceKm(home.lat, home.lon, city.lat, city.lon))}km</b>
        </p>
      )}

      {visits.length === 0 ? (
        <button type="button" className={styles.primary} onClick={() => onCheckIn(city.id)}>
          여기 다녀왔어요
        </button>
      ) : (
        <ol className={styles.timeline} aria-label="방문 기록">
          {visits.map((v, i) => (
            <TimelineItem
              key={v.id}
              visit={v}
              nth={visits.length - i}
              latest={i === 0 && visits.length > 1}
              first={i === visits.length - 1}
              isOnly={visits.length === 1}
              city={city}
              open={open === v.id}
              onToggle={() => setOpen(open === v.id ? null : v.id)}
              onPhoto={(pi) => setViewer({ start: photoIndex(v, pi) })}
              onCheckIn={onCheckIn}
            />
          ))}
        </ol>
      )}

      {visits.length > 0 && <Revisit cityId={city.id} onCheckIn={onCheckIn} />}
      {viewer && photos.length > 0 && (
        <PhotoViewer photos={photos} start={viewer.start} onClose={() => setViewer(null)} />
      )}
    </section>
  );
}

/** 방문 수만큼 겹쳐 쌓은 도장 (최신이 맨 위, 아래 것은 옅게). 최대 5장 */
function StampStack({ city, visits }: { city: City; visits: Visit[] }) {
  const shown = visits.slice(0, 5);
  return (
    <div className={styles.stack}>
      {shown.length === 0 && <Stamp city={city} size={132} />}
      {[...shown].reverse().map((v, i, arr) => {
        const depth = arr.length - 1 - i;
        return (
          <Stamp
            key={v.id}
            city={city}
            visit={v}
            nth={visits.length - depth}
            size={132}
            className={styles.layer}
            style={{
              opacity: depth === 0 ? 1 : Math.max(0.08, 0.26 - depth * 0.06),
              transform:
                depth === 0
                  ? undefined
                  : `translate(${(depth % 2 ? -1 : 1) * (10 + depth * 6)}px, ${depth * 5}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

interface ItemProps {
  visit: Visit;
  nth: number;
  latest: boolean;
  first: boolean;
  isOnly: boolean;
  city: City;
  open: boolean;
  onToggle: () => void;
  onPhoto: (index: number) => void;
  onCheckIn: (cityId: string, date?: string) => void;
}

/** 타임라인 항목: "2번째 · 2025.12.20 – 12.23 · 3박", 메모, 사진 줄. 탭하면 그 자리에서 펼쳐 편집 */
function TimelineItem({
  visit,
  nth,
  latest,
  first,
  isOnly,
  city,
  open,
  onToggle,
  onPhoto,
  onCheckIn,
}: ItemProps) {
  const nights = stayNights(visit);
  const label = first && !isOnly ? 'FIRST' : latest ? 'LATEST' : null;
  return (
    <li className={styles.item} data-first={first}>
      <span className={styles.dot} aria-hidden />
      <button type="button" className={styles.itemHead} onClick={onToggle} aria-expanded={open}>
        <span className={styles.itemTitle}>
          <b>{nth === 1 ? '첫 방문' : `${nth}번째`}</b>
          <span>
            {dateRange(visit.date, visit.endDate)} · {nights === 0 ? '당일' : `${nights}박`}
          </span>
        </span>
        {label && <span className={styles.label}>{label}</span>}
      </button>
      {visit.note && !open && <p className={styles.note}>{visit.note}</p>}
      {visit.photos.length > 0 && (
        <ul className={styles.thumbs} aria-label="사진">
          {visit.photos.map((p, i) => (
            <li key={i}>
              <Thumb blob={p} onClick={() => onPhoto(i)} label={`사진 ${i + 1} 보기`} />
            </li>
          ))}
        </ul>
      )}
      {open && (
        <VisitEditor visit={visit} city={city} isOnly={isOnly} onCheckIn={onCheckIn} onDone={onToggle} />
      )}
    </li>
  );
}

function Thumb({ blob, onClick, label }: { blob: Blob; onClick: () => void; label: string }) {
  const url = useBlobUrl(blob);
  return (
    <button type="button" className={styles.thumb} onClick={onClick} aria-label={label}>
      {url && <img src={url} alt="" />}
    </button>
  );
}

interface EditorProps {
  visit: Visit;
  city: City;
  isOnly: boolean;
  onCheckIn: (cityId: string, date?: string) => void;
  onDone: () => void;
}

/** 펼친 항목: 날짜·종료일, 한 줄 메모, 사진, ... 메뉴(삭제) */
function VisitEditor({ visit, city, isOnly, onCheckIn, onDone }: EditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(visit.note);
  const [menu, setMenu] = useState<'closed' | 'open' | 'confirm'>('closed');
  const [hints, setHints] = useState<PhotoHints | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();
  const near =
    hints?.lat !== undefined && hints.lon !== undefined ? cityNear(CITIES, hints.lat, hints.lon, 50) : null;

  return (
    <div className={styles.editor}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>방문일</span>
          <input
            type="date"
            value={visit.date}
            max={today}
            onChange={(e) =>
              e.target.value && void updateVisit(db, visit.id, normalizeRange(e.target.value, visit.endDate))
            }
          />
        </label>
        <label className={styles.field}>
          <span>떠난 날</span>
          <input
            type="date"
            value={visit.endDate ?? ''}
            min={visit.date}
            onChange={(e) =>
              void updateVisit(db, visit.id, normalizeRange(visit.date, e.target.value || undefined))
            }
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>
          한 줄 메모{' '}
          <small>
            {note.length}/{NOTE_MAX}
          </small>
        </span>
        <input
          type="text"
          value={note}
          maxLength={NOTE_MAX}
          placeholder="기억하고 싶은 한 줄"
          enterKeyHint="done"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== visit.note && void updateVisit(db, visit.id, { note })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      <div className={styles.photoEdit}>
        {visit.photos.map((p, i) => (
          <EditablePhoto key={i} blob={p} onRemove={() => void removePhoto(db, visit, i)} index={i} />
        ))}
        {visit.photos.length < MAX_PHOTOS && (
          <button
            type="button"
            className={styles.addPhoto}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Camera aria-hidden />
            <span>{busy ? '넣는 중' : '사진 추가'}</span>
          </button>
        )}
        <input
          ref={fileRef}
          className={styles.hidden}
          type="file"
          accept="image/*"
          multiple
          aria-label="사진 파일"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (!files.length) return;
            setBusy(true);
            try {
              const r = await addPhotos(db, visit, files);
              setHints(r.hints);
              void warnIfStorageFull();
            } catch (err) {
              if (!reportWriteError(err, '사진을')) throw err;
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>

      {/* 사진 EXIF로 제안: 촬영일이 다르면 방문일, GPS가 다른 도시면 그 도시 기록 */}
      {hints?.date && hints.date !== visit.date && hints.date <= today && (
        <p className={styles.suggest}>
          사진은 {koreanDate(hints.date)}에 찍혔어요.
          <button
            type="button"
            onClick={() => void updateVisit(db, visit.id, normalizeRange(hints.date!, visit.endDate))}
          >
            방문일로 바꾸기
          </button>
        </p>
      )}
      {near && near.city.id !== city.id && (
        <p className={styles.suggest}>
          {near.city.name.ko} 근처에서 찍은 사진이에요.
          <button
            type="button"
            onClick={() =>
              onCheckIn(near.city.id, hints?.date && hints.date <= today ? hints.date : undefined)
            }
          >
            {near.city.name.ko} 방문으로 기록
          </button>
        </p>
      )}

      <div className={styles.editorFoot}>
        <button
          type="button"
          className={styles.more}
          aria-label="더보기"
          aria-expanded={menu !== 'closed'}
          onClick={() => setMenu(menu === 'closed' ? 'open' : 'closed')}
        >
          <MoreHorizontal aria-hidden />
        </button>
        <button type="button" className={styles.done} onClick={onDone}>
          완료
        </button>
      </div>
      {menu === 'open' && (
        <div className={styles.menu}>
          <button type="button" className={styles.danger} onClick={() => setMenu('confirm')}>
            이 방문 기록 삭제
          </button>
        </div>
      )}
      {menu === 'confirm' && (
        <div className={styles.confirm} role="alertdialog" aria-label="방문 기록 삭제 확인">
          <p>
            {isOnly
              ? `마지막 방문이라 지우면 ${city.name.ko}이(가) 아직 안 간 도시로 돌아가요.`
              : `${dateRange(visit.date, visit.endDate)} 방문 기록을 지울까요?`}{' '}
            메모와 사진도 함께 지워져요.
          </p>
          <div>
            <button type="button" onClick={() => setMenu('closed')}>
              취소
            </button>
            <button type="button" className={styles.danger} onClick={() => void deleteVisit(db, visit.id)}>
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditablePhoto({ blob, onRemove, index }: { blob: Blob; onRemove: () => void; index: number }) {
  const url = useBlobUrl(blob);
  return (
    <div className={styles.editPhoto}>
      {url && <img src={url} alt="" />}
      <button type="button" onClick={onRemove} aria-label={`사진 ${index + 1} 빼기`}>
        <X aria-hidden />
      </button>
    </div>
  );
}

/** 하단 "다시 방문 기록": 날짜를 고르고(기본 오늘, 지난 날짜 가능) 추가 */
function Revisit({
  cityId,
  onCheckIn,
}: {
  cityId: string;
  onCheckIn: (cityId: string, date?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const today = todayISO();
  const [date, setDate] = useState(today);
  if (!picking)
    return (
      <button type="button" className={styles.revisit} onClick={() => setPicking(true)}>
        <Plus aria-hidden /> 다시 방문 기록
      </button>
    );
  return (
    <form
      className={styles.revisitForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!date) return;
        setPicking(false);
        onCheckIn(cityId, date);
      }}
    >
      <label className={styles.field}>
        <span>언제 다녀왔나요?</span>
        <input type="date" value={date} max={today} required onChange={(e) => setDate(e.target.value)} />
      </label>
      <div>
        <button type="button" onClick={() => setPicking(false)}>
          취소
        </button>
        <button type="submit" className={styles.primarySmall}>
          기록
        </button>
      </div>
    </form>
  );
}
