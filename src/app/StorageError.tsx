import { DatabaseZap, RotateCw } from 'lucide-react';
import styles from './StorageError.module.css';

/**
 * 기록을 저장할 곳(IndexedDB)을 열 수 없을 때의 안내 화면.
 * 시크릿(개인 정보 보호) 모드, 저장소를 막은 브라우저 설정, 저장 공간 부족 등에서 생긴다
 */
export function StorageError({ quota }: { quota: boolean }) {
  return (
    <main className={styles.page} aria-labelledby="storage-error-title">
      <DatabaseZap className={styles.icon} aria-hidden />
      <h1 id="storage-error-title" className={styles.title}>
        기록을 저장할 수 없어요
      </h1>
      {quota ? (
        <p className={styles.text}>
          기기의 저장 공간이 가득 찼어요. 사진이나 다른 앱의 데이터를 정리한 뒤 다시 열어 주세요. 지금까지의
          기록은 그대로 남아 있어요.
        </p>
      ) : (
        <>
          <p className={styles.text}>
            이 브라우저에서 앱 저장소를 쓸 수 없어요. 시크릿(개인 정보 보호) 모드이거나, 사이트 데이터 저장을
            막아 둔 경우에 이렇게 보여요.
          </p>
          <ul className={styles.list}>
            <li>일반 창에서 다시 열어 보세요</li>
            <li>브라우저 설정에서 이 사이트의 쿠키·사이트 데이터를 허용해 주세요</li>
          </ul>
        </>
      )}
      <button type="button" className={styles.button} onClick={() => location.reload()}>
        <RotateCw aria-hidden />
        다시 시도
      </button>
    </main>
  );
}
