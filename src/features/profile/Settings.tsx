import { useRef, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Database,
  Download,
  House,
  Info,
  Scale,
  SunMoon,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { useUI } from '../../app/store';
import { getCity } from '../../data/cities';
import { ATTRIBUTIONS } from '../../data/attributions';
import { LICENSES } from '../../data/licenses';
import {
  BackupFormatError,
  backupFileName,
  deleteAllData,
  exportBackup,
  importBackup,
} from '../../db/backup';
import { db } from '../../db/db';
import type { Profile } from '../../db/types';
import { markBadgesSeen } from './badgeSync';
import { Dialog } from '../../components/Dialog/Dialog';
import styles from './Settings.module.css';
import ui from '../../components/Dialog/ui.module.css';
import { loadTheme, setTheme, type ThemePref } from './theme';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

type Sheet = 'delete' | 'licenses' | 'sources' | null;

/** 프로필 맨 아래 설정 목록 */
export function Settings({
  profile,
  visitCount,
  onEditProfile,
}: {
  profile: Profile;
  visitCount: number;
  onEditProfile: () => void;
}) {
  const [theme, setThemeState] = useState(loadTheme);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = (message: string) => useUI.getState().showToast({ message });

  const doExport = async () => {
    setBusy(true);
    try {
      const zip = await exportBackup(db);
      const url = URL.createObjectURL(
        new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast('백업 파일을 저장했어요');
    } catch (err) {
      console.error('[backup]', err);
      toast('백업을 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const result = await importBackup(db, new Uint8Array(await file.arrayBuffer()));
      // 가져온 기록으로 얻은 배지는 알리지 않는다
      await markBadgesSeen(db);
      const n = result.added + result.updated;
      toast(n ? `기록 ${n}개를 가져왔어요` : '새로 가져올 기록이 없어요');
    } catch (err) {
      toast(err instanceof BackupFormatError ? err.message : '백업을 가져오지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setSheet(null);
    await deleteAllData(db);
    toast('모든 기록을 지웠어요');
  };

  return (
    <section className={styles.section} aria-labelledby="settings-title">
      <h2 id="settings-title" className={styles.title}>
        설정
      </h2>

      <ul className={styles.group}>
        <Row icon={<UserRound />} label="이름" value={profile.name} onClick={onEditProfile} />
        <Row
          icon={<House />}
          label="홈 도시"
          value={getCity(profile.homeCityId)?.name.ko ?? profile.homeCityId}
          onClick={onEditProfile}
        />
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden>
            <SunMoon />
          </span>
          <span className={styles.label} id="theme-label">
            테마
          </span>
          <span className={styles.segment} role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => {
                  setTheme(t.value);
                  setThemeState(t.value);
                }}
              >
                {t.label}
              </button>
            ))}
          </span>
        </li>
      </ul>

      <ul className={styles.group}>
        <Row
          icon={<Download />}
          label="백업 내보내기"
          hint="사진 포함 zip"
          onClick={doExport}
          disabled={busy}
        />
        <Row
          icon={<Upload />}
          label="백업 가져오기"
          hint="zip 또는 이전 버전 JSON"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        />
        <Row
          icon={<Trash2 />}
          label="모든 기록 삭제"
          danger
          onClick={() => setSheet('delete')}
          disabled={busy || visitCount === 0}
        />
      </ul>
      <input
        ref={fileRef}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        className={styles.file}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void doImport(file);
        }}
      />

      <ul className={styles.group}>
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden>
            <Info />
          </span>
          <span className={styles.label}>버전</span>
          <span className={styles.value}>{__APP_VERSION__}</span>
        </li>
        <Row icon={<Scale />} label="오픈소스 라이선스" onClick={() => setSheet('licenses')} />
        <Row icon={<Database />} label="데이터 출처" onClick={() => setSheet('sources')} />
      </ul>

      <Dialog
        open={sheet === 'delete'}
        title="모든 기록 삭제"
        onClose={() => setSheet(null)}
        footer={
          <>
            <button type="button" className={ui.button} onClick={() => setSheet(null)}>
              취소
            </button>
            <button type="button" className={ui.danger} onClick={() => void doDelete()}>
              모두 삭제
            </button>
          </>
        }
      >
        <p className={ui.text}>
          방문 기록 <b>{visitCount}개</b>와 메모, 사진이 모두 지워지고 되돌릴 수 없어요. 먼저 백업을 내보내
          두세요. 이름과 홈 도시는 그대로 남아요.
        </p>
      </Dialog>

      <Dialog open={sheet === 'licenses'} title="오픈소스 라이선스" onClose={() => setSheet(null)}>
        <ul className={styles.credits}>
          {LICENSES.map((l) => (
            <li key={l.name}>
              <a href={l.url} target="_blank" rel="noreferrer">
                {l.name}
              </a>
              <span>{l.license}</span>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog open={sheet === 'sources'} title="데이터 출처" onClose={() => setSheet(null)}>
        <ul className={styles.credits}>
          {ATTRIBUTIONS.map((a) => (
            <li key={a.name}>
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.name}
              </a>
              <span>
                {a.usage} · {a.license}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  hint,
  danger,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={styles.row} data-danger={danger} disabled={disabled} onClick={onClick}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        <span className={styles.label}>
          {label}
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
        {value && <span className={styles.value}>{value}</span>}
        <ChevronRight className={styles.chevron} aria-hidden />
      </button>
    </li>
  );
}
