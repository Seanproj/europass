import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { HOME, useUI } from '../../app/store';
import { markBadgesSeen } from '../profile/badgeSync';

beforeEach(async () => {
  await db.visits.clear();
  await db.settings.clear();
  await markBadgesSeen(db);
  useUI.setState({
    searchOpen: false,
    route: HOME,
    toast: null,
    toastQueue: [],
    stampFx: null,
    sheetSnap: 'peek',
  });
  history.replaceState(null, '', '/');
});

describe('검색 → 체크인 → 되돌리기 (탭 2번)', () => {
  it('"ㅍㄹㅎ"로 프라하를 찾아 체크인하고, 되돌리면 기록이 사라진다', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /어디 다녀오셨어요/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: '도시 검색' }), { target: { value: 'ㅍㄹㅎ' } });
    const results = screen.getByRole('list', { name: '검색 결과' });
    const prague = results.querySelector('button')!;
    expect(prague).toHaveTextContent('프라하');

    await act(async () => fireEvent.click(prague));
    await waitFor(async () => expect(await db.visits.where('cityId').equals('cz-prague').count()).toBe(1));
    expect(await screen.findByText('프라하 도장 획득')).toBeInTheDocument();
    // 시트는 도시 상세로
    expect(await screen.findByRole('heading', { name: '프라하' })).toBeInTheDocument();
    expect(useUI.getState().route).toEqual({ kind: 'city', id: 'cz-prague' });
    expect(location.search).toBe('?city=cz-prague');

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    await waitFor(async () => expect(await db.visits.count()).toBe(0));
  });

  it('같은 날 다시 찍으면 새 기록 대신 안내', async () => {
    render(<App />);
    const open = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /어디 다녀오셨어요/ }));
      fireEvent.change(screen.getByRole('searchbox', { name: '도시 검색' }), { target: { value: 'praha' } });
      await act(async () =>
        fireEvent.click(screen.getByRole('list', { name: '검색 결과' }).querySelector('button')!),
      );
    };
    await open();
    await waitFor(async () => expect(await db.visits.count()).toBe(1));
    // 도시 상세에서 홈으로 돌아가 다시 검색
    const pop = new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    fireEvent.click(await screen.findByRole('button', { name: '뒤로' }));
    await act(() => pop);
    await open();
    expect(await screen.findByText('오늘 이미 기록했어요 · 프라하')).toBeInTheDocument();
    expect(await db.visits.count()).toBe(1);
  });
});

describe('배지 토스트', () => {
  const checkInPrague = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /어디 다녀오셨어요/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: '도시 검색' }), { target: { value: '프라하' } });
    await act(async () =>
      fireEvent.click(screen.getByRole('list', { name: '검색 결과' }).querySelector('button')!),
    );
  };

  it('체크인 토스트가 사라진 다음 차례로 나오고, 한 번만 알린다', async () => {
    render(<App />);
    await checkInPrague();
    expect(await screen.findByText('프라하 도장 획득')).toBeInTheDocument();
    await waitFor(() => expect(useUI.getState().toastQueue).toHaveLength(1));
    expect(screen.queryByText('배지 획득 · 첫 도장')).not.toBeInTheDocument();

    act(() => useUI.getState().dismissToast());
    expect(await screen.findByText('배지 획득 · 첫 도장')).toBeInTheDocument();
    act(() => useUI.getState().dismissToast());

    // 다른 날짜로 다시 체크인해도 첫 도장은 다시 알리지 않는다
    const seen = (await db.settings.get('badgesSeen'))?.value as string[];
    expect(seen).toContain('cities-1');
  });

  it('되돌리면 줄 선 배지 토스트도 거두고, 다시 얻으면 다시 알린다', async () => {
    render(<App />);
    await checkInPrague();
    await waitFor(() => expect(useUI.getState().toastQueue).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    await waitFor(async () => expect(await db.visits.count()).toBe(0));
    expect(useUI.getState().toastQueue).toHaveLength(0);
    expect(screen.queryByText('배지 획득 · 첫 도장')).not.toBeInTheDocument();
    await waitFor(async () => expect((await db.settings.get('badgesSeen'))?.value).not.toContain('cities-1'));
  });
});
