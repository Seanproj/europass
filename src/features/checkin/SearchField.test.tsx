import { fireEvent, render, screen } from '@testing-library/react';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('탭하면 시트를 펼치도록 알린다', () => {
    const onOpen = vi.fn();
    render(<SearchField onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /어디 다녀오셨어요/ }));
    fireEvent.click(screen.getByRole('button', { name: '현재 위치로 찾기' }));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
