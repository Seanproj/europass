import { useEffect, useState } from 'react';

/** 화면 높이 (모바일 주소창 변화까지 반영) */
export function useViewportHeight(): number {
  const read = () => window.visualViewport?.height ?? window.innerHeight;
  const [h, setH] = useState(read);
  useEffect(() => {
    const update = () => setH(read());
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return h;
}

/** env(safe-area-inset-*) 값을 px로 읽는다 (노치, 홈 인디케이터) */
export function readSafeArea(): { top: number; bottom: number } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const res = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  probe.remove();
  return res;
}
