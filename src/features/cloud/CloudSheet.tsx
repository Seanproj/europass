import { useEffect, useState } from 'react';
import { Copy, LogOut, Mail, RefreshCw } from 'lucide-react';
import { useUI } from '../../app/store';
import { Dialog } from '../../components/Dialog/Dialog';
import ui from '../../components/Dialog/ui.module.css';
import { loadBackend } from '../../cloud/backend';
import { syncNow, useCloud } from '../../cloud/controller';
import { STATUS, ago } from './status';
import { HANDLE_RE, HandleTakenError, type PublicSettings } from '../../cloud/types';
import styles from './CloudSheet.module.css';

const toast = (message: string) => useUI.getState().showToast({ message });

/** 설정의 "기기 간 동기화": 로그인 → 상태 · 지금 동기화 · 로그아웃 · 공개 프로필 */
export function CloudSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useCloud((s) => s.user);
  return (
    <Dialog open={open} title="기기 간 동기화" onClose={onClose}>
      {open && (user ? <SignedIn /> : <SignedOut />)}
    </Dialog>
  );
}

function SignedOut() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(`로그인하지 못했어요: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.body}>
      <p className={ui.text}>
        로그인하면 기록과 사진이 다른 기기와 맞춰져요. 로그인하지 않아도 지금처럼 이 기기에 그대로 저장돼요.
      </p>
      <button
        type="button"
        className={ui.primary}
        disabled={busy}
        onClick={() => void run(async () => (await loadBackend())?.signInWithGoogle())}
      >
        Google로 계속하기
      </button>
      <form
        className={styles.email}
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await (await loadBackend())?.signInWithEmail(email.trim());
            setSent(true);
          });
        }}
      >
        <label className={ui.label} htmlFor="cloud-email">
          또는 이메일로 로그인 링크 받기
        </label>
        <div className={styles.inline}>
          <input
            id="cloud-email"
            className={ui.input}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className={ui.button} disabled={busy}>
            <Mail aria-hidden />
            보내기
          </button>
        </div>
      </form>
      {sent && (
        <p className={ui.text} role="status">
          메일로 로그인 링크를 보냈어요. <b>이 브라우저에서</b> 링크를 열어 주세요.
        </p>
      )}
    </div>
  );
}

function SignedIn() {
  const { user, status, lastSyncAt, pending, error } = useCloud();
  return (
    <div className={styles.body}>
      <p className={ui.text}>
        <b>{user?.email ?? '로그인됨'}</b>
        <br />
        {STATUS[status]} · 마지막 동기화 {ago(lastSyncAt)}
        {pending > 0 && ` · 올릴 변경 ${pending}개`}
      </p>
      {status === 'error' && error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.primary}
          disabled={status === 'syncing'}
          onClick={() => void syncNow()}
        >
          <RefreshCw aria-hidden />
          지금 동기화
        </button>
        <button
          type="button"
          className={ui.button}
          onClick={() => void loadBackend()?.then((b) => b.signOut())}
        >
          <LogOut aria-hidden />
          로그아웃
        </button>
      </div>
      <p className={styles.hint}>로그아웃해도 이 기기의 기록은 지워지지 않아요.</p>
      <PublicProfileSettings />
    </div>
  );
}

const EMPTY: PublicSettings = { handle: null, isPublic: false, shareNotes: false, sharePhotos: false };

function PublicProfileSettings() {
  const user = useCloud((s) => s.user);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadBackend()
      ?.then((b) => (user ? b.remote(user).getPublicSettings() : EMPTY))
      .catch(() => EMPTY)
      .then((s) => {
        if (!alive) return;
        setSettings(s);
        setHandle(s.handle ?? '');
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!settings || !user) return null;

  // 바로 바꿔 보여 주고, 저장에 실패하면 되돌린다
  const save = async (next: PublicSettings) => {
    const prev = settings;
    setError(null);
    setSettings(next);
    try {
      // 공개 프로필에 이름·기록이 보이도록 먼저 맞춘다
      if (next.isPublic) await syncNow();
      const backend = await loadBackend();
      await backend?.remote(user).setPublicSettings(next);
    } catch (err) {
      setSettings(prev);
      setError(err instanceof HandleTakenError ? err.message : '저장하지 못했어요');
    }
  };

  const valid = HANDLE_RE.test(handle);
  const link = settings.handle ? `${location.origin}${location.pathname}?u=${settings.handle}` : '';

  return (
    <section className={styles.public} aria-labelledby="public-title">
      <h3 id="public-title" className={styles.subtitle}>
        공개 프로필
      </h3>
      <p className={styles.hint}>켜면 링크를 가진 누구나 지도, 도장, 배지를 볼 수 있어요 (읽기 전용).</p>
      <form
        className={styles.inline}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void save({ ...settings, handle });
        }}
      >
        <label className={styles.prefix} htmlFor="public-handle">
          ?u=
        </label>
        <input
          id="public-handle"
          className={ui.input}
          value={handle}
          maxLength={20}
          autoCapitalize="none"
          autoComplete="off"
          aria-describedby="public-handle-hint"
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
        />
        <button type="submit" className={ui.button} disabled={!valid || handle === settings.handle}>
          저장
        </button>
      </form>
      <p id="public-handle-hint" className={styles.hint}>
        영문 소문자·숫자·밑줄 3~20자
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <Toggle
        label="공개"
        checked={settings.isPublic}
        disabled={!settings.handle}
        onChange={(v) => void save({ ...settings, isPublic: v })}
      />
      <Toggle
        label="메모도 공개"
        checked={settings.shareNotes}
        onChange={(v) => void save({ ...settings, shareNotes: v })}
      />
      <Toggle
        label="사진도 공개"
        checked={settings.sharePhotos}
        onChange={(v) => void save({ ...settings, sharePhotos: v })}
      />
      {settings.isPublic && link && (
        <div className={styles.link}>
          <span>{link}</span>
          <button
            type="button"
            className={ui.button}
            onClick={() =>
              void navigator.clipboard
                ?.writeText(link)
                .then(() => toast('링크를 복사했어요'))
                .catch(() => toast('복사하지 못했어요'))
            }
          >
            <Copy aria-hidden />
            링크 복사
          </button>
        </div>
      )}
    </section>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        className={styles.switch}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
