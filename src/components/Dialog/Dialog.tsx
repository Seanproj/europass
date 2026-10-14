import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 아래 고정 버튼 줄 */
  footer?: ReactNode;
}

/**
 * 프로필·공유에서 쓰는 시트 (모두 보기, 편집, 삭제 확인, 앱 정보, 공유 카드).
 * 네이티브 <dialog>라 포커스 가두기, Esc 닫기, 배경 가리기를 브라우저가 맡는다.
 * 모바일은 아래에서 올라오는 시트, 넓은 화면은 가운데 카드
 */
export function Dialog({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 바깥(배경)을 누르면 닫기
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <header className={styles.head}>
            <h2 className={styles.title}>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
              <X aria-hidden />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
