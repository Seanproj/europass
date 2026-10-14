import { act, renderHook } from '@testing-library/react';
import { goBack, navigate, routeFromSearch, searchFromRoute, useNavSync } from './nav';
import { HOME, useUI } from './store';

const waitPop = () => new Promise((r) => window.addEventListener('popstate', r, { once: true }));

beforeEach(() => {
  history.replaceState(null, '', '/');
  useUI.setState({ route: HOME, sheetSnap: 'peek' });
});

describe('시트 내비게이션', () => {
  it('URL 쿼리 ↔ 화면', () => {
    expect(routeFromSearch('?country=cz')).toEqual({ kind: 'country', code: 'CZ' });
    expect(routeFromSearch('?city=cz-prague')).toEqual({ kind: 'city', id: 'cz-prague' });
    expect(routeFromSearch('?city=nowhere')).toEqual(HOME);
    expect(routeFromSearch('?country=ZZ')).toEqual(HOME);
    expect(routeFromSearch('?profile')).toEqual({ kind: 'profile' });
    expect(routeFromSearch('?wrap=2026')).toEqual({ kind: 'wrap', year: 2026 });
    expect(routeFromSearch('?wrap=abc')).toEqual(HOME);
    expect(searchFromRoute({ kind: 'wrap', year: 2026 })).toBe('?wrap=2026');
    expect(routeFromSearch('?u=Sean_1')).toEqual({ kind: 'public', handle: 'sean_1' });
    expect(routeFromSearch('?u=a')).toEqual(HOME);
    expect(searchFromRoute({ kind: 'public', handle: 'sean' })).toBe('?u=sean');
    expect(searchFromRoute({ kind: 'city', id: 'cz-prague' })).toBe('?city=cz-prague');
    expect(searchFromRoute(HOME)).toBe('');
  });

  it('국가 → 도시로 들어가고, 뒤로가기 2번으로 홈', async () => {
    renderHook(() => useNavSync());
    act(() => navigate({ kind: 'country', code: 'CZ' }));
    expect(location.search).toBe('?country=CZ');
    expect(useUI.getState().sheetSnap).toBe('half');
    act(() => navigate({ kind: 'city', id: 'cz-prague' }));
    expect(location.search).toBe('?city=cz-prague');

    let pop = waitPop();
    act(() => goBack());
    await act(() => pop);
    expect(useUI.getState().route).toEqual({ kind: 'country', code: 'CZ' });
    pop = waitPop();
    act(() => goBack());
    await act(() => pop);
    expect(useUI.getState().route).toEqual(HOME);
    expect(location.search).toBe('');
  });

  it('딥링크로 열면 상세를 보여주고, 뒤로가기 한 번이면 홈', async () => {
    history.replaceState(null, '', '/?city=at-vienna');
    renderHook(() => useNavSync());
    expect(useUI.getState().route).toEqual({ kind: 'city', id: 'at-vienna' });
    const pop = waitPop();
    act(() => goBack());
    await act(() => pop);
    expect(useUI.getState().route).toEqual(HOME);
  });

  it('홈에서 뒤로 버튼은 앱 밖으로 나가지 않는다', () => {
    renderHook(() => useNavSync());
    act(() => goBack());
    expect(useUI.getState().route).toEqual(HOME);
  });
});
