import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './PhotoViewer.module.css';
import { useBlobUrl } from './useBlobUrl';

export interface ViewerPhoto {
  blob: Blob;
  /** "2번째 · 2025.12.20" */
  caption: string;
}

interface Props {
  photos: ViewerPhoto[];
  start: number;
  onClose: () => void;
}

/** 풀스크린 사진 뷰어: 같은 도시의 모든 방문 사진을 넘겨본다 (좌우 버튼, 화살표 키, 스와이프) */
export function PhotoViewer({ photos, start, onClose }: Props) {
  const [i, setI] = useState(start);
  const n = photos.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const url = useBlobUrl(photos[i]?.blob);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  const startX = useRef(0);
  return (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      {url && <img className={styles.img} src={url} alt={photos[i]?.caption} draggable={false} />}
      <div className={styles.bar}>
        <span className={styles.caption}>
          {photos[i]?.caption} · {i + 1}/{n}
        </span>
        <button type="button" className={styles.btn} onClick={onClose} aria-label="닫기" autoFocus>
          <X aria-hidden />
        </button>
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            className={`${styles.btn} ${styles.prev}`}
            onClick={() => go(-1)}
            aria-label="이전 사진"
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.next}`}
            onClick={() => go(1)}
            aria-label="다음 사진"
          >
            <ChevronRight aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
