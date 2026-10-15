import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUI } from '../../app/store';
import { Toast } from './Toast';

const reset = () =>
  useUI.setState({ toast: null, toastQueue: [], stampFx: null, celebration: null, pendingCelebration: null });

describe('토스트 시간', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    vi.useRealTimers();
    reset();
  });

  it('5초 뒤 사라진다', () => {
    render(<Toast />);
    act(() => void useUI.getState().showToast({ message: '안녕' }));
    act(() => void vi.advanceTimersByTime(4900));
    expect(screen.queryByText('안녕')).not.toBeNull();
    act(() => void vi.advanceTimersByTime(200));
    expect(useUI.getState().toast).toBeNull();
  });

  it('paused로 띄우면 resumeToast 전까지 시간을 재지 않는다 (체크인 기념 판정 중)', () => {
    render(<Toast />);
    let id = 0;
    act(() => void (id = useUI.getState().showToast({ message: '빈 도장 획득', paused: true })));
    act(() => void vi.advanceTimersByTime(20_000));
    expect(useUI.getState().toast?.message).toBe('빈 도장 획득');
    act(() => useUI.getState().resumeToast(id));
    act(() => void vi.advanceTimersByTime(5100));
    expect(useUI.getState().toast).toBeNull();
  });

  it('도장 연출과 기다리는 기념 연출이 있는 동안은 멈추고, 끝나면 5초를 다시 센다', () => {
    render(<Toast />);
    act(() => {
      useUI.getState().showToast({ message: '빈 도장 획득' });
      useUI.getState().playStamp({ cityId: 'at-vienna', visit: { id: 'v1', date: '2026-10-15' }, nth: 1 });
      useUI.getState().celebrate({
        cityId: 'at-vienna',
        visit: { id: 'v1', date: '2026-10-15' },
        nth: 1,
        milestones: [{ id: 'country:AT', kind: 'country', country: 'AT', ordinal: 1 }],
      });
    });
    expect(useUI.getState().pendingCelebration).not.toBeNull();
    act(() => void vi.advanceTimersByTime(8000));
    expect(useUI.getState().toast).not.toBeNull();
    // 도장이 걷히면 기념이 화면에 뜨고, 그때부터 5초
    act(() => useUI.getState().clearStamp(useUI.getState().stampFx!.nonce));
    expect(useUI.getState().celebration).not.toBeNull();
    act(() => void vi.advanceTimersByTime(4900));
    expect(useUI.getState().toast).not.toBeNull();
    act(() => void vi.advanceTimersByTime(200));
    expect(useUI.getState().toast).toBeNull();
  });
});
