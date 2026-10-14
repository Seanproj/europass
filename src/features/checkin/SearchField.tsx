import { useEffect, useRef } from 'react';
import { LocateFixed, Search, X } from 'lucide-react';
import styles from './SearchField.module.css';

interface Props {
  active: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onOpen: () => void;
  onLocate: () => void;
  onClose: () => void;
  onSubmit: () => void;
  /** 위치 권한이 거부됐거나 기기가 지원하지 않으면 버튼을 숨김 */
  canLocate: boolean;
}

/** 시트 맨 위 검색창. 접힌 상태에서는 버튼, 탭하면 실제 입력창이 되고 시트가 펼쳐진다 */
export function SearchField({
  active,
  query,
  onQueryChange,
  onOpen,
  onLocate,
  onClose,
  onSubmit,
  canLocate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  return (
    <div className={styles.field}>
      {active ? (
        <form
          className={styles.form}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Search className={styles.icon} aria-hidden />
          <input
            ref={inputRef}
            className={styles.input}
            type="search"
            enterKeyHint="go"
            autoComplete="off"
            spellCheck={false}
            placeholder="도시 이름, 초성(ㅍㄹㅎ)"
            aria-label="도시 검색"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
        </form>
      ) : (
        <button type="button" className={styles.trigger} onClick={onOpen}>
          <Search className={styles.icon} aria-hidden />
          <span>어디 다녀오셨어요?</span>
        </button>
      )}
      {active ? (
        <button
          type="button"
          className={`${styles.locate} ${styles.close}`}
          aria-label="검색 닫기"
          onClick={onClose}
        >
          <X aria-hidden />
        </button>
      ) : (
        canLocate && (
          <button type="button" className={styles.locate} aria-label="현재 위치로 찾기" onClick={onLocate}>
            <LocateFixed aria-hidden />
          </button>
        )
      )}
    </div>
  );
}
