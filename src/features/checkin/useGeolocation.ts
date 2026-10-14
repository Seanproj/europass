import { useCallback, useEffect, useState } from 'react';

export type GeoState =
  | { status: 'idle' | 'locating' }
  /** 권한 거부·미지원: 버튼을 조용히 숨긴다 */
  | { status: 'hidden' }
  | { status: 'error' }
  | { status: 'found'; lat: number; lon: number };

/** 현재 위치 한 번 받기. 권한이 거부돼 있으면 처음부터 숨김 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator
      ? { status: 'idle' }
      : { status: 'hidden' },
  );

  useEffect(() => {
    let alive = true;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (alive && p.state === 'denied') setState({ status: 'hidden' });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: 'found', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? 'hidden' : 'error' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { state, locate };
}
