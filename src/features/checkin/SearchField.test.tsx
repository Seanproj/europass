import { fireEvent, render, screen } from '@testing-library/react';
import { SearchField } from './SearchField';

const props = () => ({
  active: false,
  query: '',
  onQueryChange: vi.fn(),
  onOpen: vi.fn(),
  onLocate: vi.fn(),
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  canLocate: true,
});

describe('SearchField', () => {
  it('접힌 상태: 탭하면 검색을 열고, 위치 버튼은 현재 위치 찾기', () => {
    const p = props();
    render(<SearchField {...p} />);
    fireEvent.click(screen.getByRole('button', { name: /어디 다녀오셨어요/ }));
    fireEvent.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    expect(p.onOpen).toHaveBeenCalledTimes(1);
    expect(p.onLocate).toHaveBeenCalledTimes(1);
  });

  it('위치 권한이 없으면 위치 버튼을 숨긴다', () => {
    render(<SearchField {...props()} canLocate={false} />);
    expect(screen.queryByRole('button', { name: '현재 위치로 찾기' })).toBeNull();
  });

  it('열린 상태: 입력에 포커스, 입력과 닫기', () => {
    const p = { ...props(), active: true };
    render(<SearchField {...p} />);
    const input = screen.getByRole('searchbox', { name: '도시 검색' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'ㅍㄹㅎ' } });
    expect(p.onQueryChange).toHaveBeenCalledWith('ㅍㄹㅎ');
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });
});
