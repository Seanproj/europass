import { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useUI } from '../../app/store';
import { Dialog } from '../../components/Dialog/Dialog';
import ui from '../../components/Dialog/ui.module.css';
import styles from './ShareDialog.module.css';
import { canShareFiles, shareOrDownload } from './share';

export interface ShareFormat {
  id: string;
  label: string;
  /** 가로/세로 (미리보기 칸 비율) */
  aspect: number;
  make: () => Promise<Blob>;
  fileName: string;
}

interface Props {
  open: boolean;
  title: string;
  formats: ShareFormat[];
  onClose: () => void;
}

/** 공유 카드 시트: 형식 고르기(2개 이상일 때) → 미리보기 → 공유(또는 PNG 저장) */
export function ShareDialog({ open, title, formats, onClose }: Props) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      {/* 열 때마다 지금 기록으로 새로 만든다 */}
      {open && <ShareBody formats={formats} title={title} onDone={onClose} />}
    </Dialog>
  );
}

type Result = { blob: Blob; url: string } | { error: string };

function ShareBody({
  formats,
  title,
  onDone,
}: {
  formats: ShareFormat[];
  title: string;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState(formats[0]!.id);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState(false);
  const format = formats.find((f) => f.id === current) ?? formats[0]!;
  const result = results[format.id];
  const canShare = canShareFiles();

  // 부모가 다시 그려져도 만드는 중인 카드를 버리지 않게, 형식 id가 바뀔 때만 시작한다
  const makers = useRef(formats);
  useEffect(() => {
    makers.current = formats;
  });
  const has = !!result;
  useEffect(() => {
    if (has) return;
    let alive = true;
    const f = makers.current.find((x) => x.id === current) ?? makers.current[0]!;
    f.make()
      .then((blob) => ({ blob, url: URL.createObjectURL(blob) }))
      .catch((err: unknown) => {
        console.error('[share]', err);
        return { error: '카드를 만들지 못했어요' };
      })
      .then((r) => {
        if (alive) setResults((s) => ({ ...s, [f.id]: r }));
        else if ('url' in r) URL.revokeObjectURL(r.url);
      });
    return () => {
      alive = false;
    };
  }, [current, has]);

  // 닫힐 때 미리보기 주소 정리
  const latest = useRef(results);
  useEffect(() => {
    latest.current = results;
  });
  useEffect(
    () => () => {
      for (const r of Object.values(latest.current)) if ('url' in r) URL.revokeObjectURL(r.url);
    },
    [],
  );

  const share = async () => {
    if (!result || !('blob' in result)) return;
    setBusy(true);
    const how = await shareOrDownload(result.blob, format.fileName, title);
    setBusy(false);
    if (how === 'downloaded') useUI.getState().showToast({ message: '이미지를 저장했어요' });
    if (how !== 'cancelled') onDone();
  };

  return (
    <div className={styles.body}>
      {formats.length > 1 && (
        <div className={styles.segment} role="radiogroup" aria-label="카드 형식">
          {formats.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === format.id}
              onClick={() => setCurrent(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className={styles.preview} style={{ aspectRatio: String(format.aspect) }}>
        {!result && <span className={styles.status}>카드를 만드는 중…</span>}
        {result && 'error' in result && <span className={styles.status}>{result.error}</span>}
        {result && 'url' in result && <img src={result.url} alt={`${title} 미리보기`} />}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.primary}
          disabled={!result || 'error' in result || busy}
          onClick={() => void share()}
        >
          {canShare ? <Share2 aria-hidden /> : <Download aria-hidden />}
          {canShare ? '공유하기' : '이미지 저장'}
        </button>
      </div>
    </div>
  );
}
