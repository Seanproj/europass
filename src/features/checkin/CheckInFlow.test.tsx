import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { HOME, useUI } from '../../app/store';

beforeEach(async () => {
  await db.visits.clear();
  useUI.setState({ searchOpen: false, route: HOME, toast: null, stampFx: null, sheetSnap: 'peek' });
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
