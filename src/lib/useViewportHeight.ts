import { useEffect, useState } from 'react';

export interface Viewport {
  /** 보이는 화면 높이 (모바일 주소창·키보드 변화까지 반영) */
  height: number;
  /** 화면 아래를 가리는 키보드 높이. 0이면 키보드 없음 */
  keyboard: number;
}

/**
 * iOS Safari는 키보드가 떠도 레이아웃 화면은 그대로 두고 보이는 화면(visualViewport)만 줄이고 옮긴다.
 * 그래서 bottom: 0 고정 요소는 키보드 뒤에 숨는다. 보이는 화면 아래 끝과 레이아웃 아래 끝의 차이가 키보드 높이
 */
export function keyboardInset(layoutHeight: number, visualHeight: number, visualTop: number): number {
  const inset = Math.round(layoutHeight - visualHeight - visualTop);
  // 주소창이 접히는 정도의 작은 차이는 무시
  return inset > 40 ? inset : 0;
}

function read(): Viewport {
  const vv = window.visualViewport;
  if (!vv) return { height: window.innerHeight, keyboard: 0 };
  return { height: vv.height, keyboard: keyboardInset(window.innerHeight, vv.height, vv.offsetTop) };
}

/** 화면 높이와 키보드 높이 */
export function useViewport(): Viewport {
  const [v, setV] = useState(read);
  useEffect(() => {
    const update = () =>
      setV((prev) => {
        const next = read();
        return next.height === prev.height && next.keyboard === prev.keyboard ? prev : next;
      });
    const vv = window.visualViewport;
    window.addEventListener('resize', update);
    vv?.addEventListener('resize', update);
    // 키보드가 뜨며 보이는 화면이 위로 밀릴 때 (offsetTop 변화)
    vv?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);
  return v;
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
