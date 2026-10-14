import { fireEvent, render, screen } from '@testing-library/react';
import { SelectionCard } from './SelectionCard';

describe('지도에서 고른 도시·나라 (임시 상세)', () => {
  it('도시: 이름, 나라, 방문 횟수', () => {
    render(
      <SelectionCard
        selection={{ kind: 'city', id: 'cz-prague' }}
        visits={new Map([['cz-prague', 3]])}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: '프라하' })).toBeInTheDocument();
    expect(screen.getByText('체코 · 3번 방문')).toBeInTheDocument();
  });

  it('나라: 방문한 도시 수 / 전체', () => {
    render(
      <SelectionCard
        selection={{ kind: 'country', code: 'LU' }}
        visits={new Map([['lu-luxembourg', 1]])}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: '룩셈부르크' })).toBeInTheDocument();
    expect(screen.getByText('서유럽 · 도시 1 / 5곳')).toBeInTheDocument();
  });

  it('닫기 버튼', () => {
    const onClose = vi.fn();
    render(
      <SelectionCard selection={{ kind: 'city', id: 'fr-paris' }} visits={new Map()} onClose={onClose} />,
    );
    expect(screen.getByText('프랑스 · 아직 안 가본 도시')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
