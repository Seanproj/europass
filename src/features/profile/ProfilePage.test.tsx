import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from '../../app/App';
import { HOME, useUI } from '../../app/store';
import { db } from '../../db/db';
import type { Visit } from '../../db/types';

const visit = (id: string, cityId: string, date: string, note = ''): Visit => ({
  id,
  cityId,
  date,
  note,
  photos: [],
  createdAt: 1,
  updatedAt: 1,
});

beforeEach(async () => {
  await db.visits.clear();
  await db.settings.clear();
  useUI.setState({ route: HOME, toast: null, toastQueue: [], searchOpen: false, sheetSnap: 'peek' });
  history.replaceState(null, '', '/');
});

describe('프로필 페이지', () => {
  it('프로필 버튼으로 열고, 숫자·배지·타임라인·설정을 보여 주고, 뒤로 닫힌다', async () => {
    await db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await db.visits.bulkPut([
      visit('a', 'cz-prague', '2025-03-01', '카를교\n두 번째 줄'),
      visit('b', 'cz-prague', '2025-05-02'),
      visit('c', 'fr-paris', '2025-05-10'),
    ]);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '프로필' }));
    const page = await screen.findByRole('main', { name: 'Sean' }, { timeout: 5000 });
    expect(location.search).toBe('?profile');
    expect(within(page).getByText('프랑크푸르트에서 출발')).toBeInTheDocument();
    expect(within(page).getByText(/총 3번의 방문 · 가장 많이 간 도시 프라하\(2\)/)).toBeInTheDocument();
    // 배지 줄: 첫 도장, 또 왔어요는 획득
    expect(within(page).getByRole('heading', { name: /배지/ })).toBeInTheDocument();
    // 타임라인: 월별, 재방문 표시, 메모 첫 줄만
    expect(within(page).getByRole('heading', { name: '2025년 5월' })).toBeInTheDocument();
    expect(within(page).getByText('· 2번째')).toBeInTheDocument();
    expect(within(page).getByText('카를교')).toBeInTheDocument();
    expect(within(page).queryByText(/두 번째 줄/)).not.toBeInTheDocument();
    // 설정
    expect(within(page).getByRole('radio', { name: '자동' })).toHaveAttribute('aria-checked', 'true');
    expect(within(page).getByText(__APP_VERSION__)).toBeInTheDocument();

    const pop = new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    fireEvent.click(within(page).getByRole('button', { name: '지도로 돌아가기' }));
    await act(() => pop);
    await waitFor(() => expect(screen.queryByRole('main', { name: 'Sean' })).not.toBeInTheDocument());
  });

  it('모든 기록 삭제는 확인을 받는다', async () => {
    await db.visits.bulkPut([visit('a', 'cz-prague', '2025-03-01')]);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '프로필' }));
    const page = await screen.findByRole('main', {}, { timeout: 5000 });
    await waitFor(() => expect(within(page).getByRole('button', { name: /모든 기록 삭제/ })).toBeEnabled());
    fireEvent.click(within(page).getByRole('button', { name: /모든 기록 삭제/ }));
    // 아직 지워지지 않음
    expect(await db.visits.count()).toBe(1);
    fireEvent.click(await screen.findByRole('button', { name: '모두 삭제' }));
    await waitFor(async () => expect(await db.visits.count()).toBe(0));
    expect(await screen.findByText('모든 기록을 지웠어요')).toBeInTheDocument();
  });

  it('테마를 바꾸면 문서에 바로 적용된다', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '프로필' }));
    fireEvent.click(await screen.findByRole('radio', { name: '다크' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: '자동' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
