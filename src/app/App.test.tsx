import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App 골격', () => {
  it('진행률 알약, 프로필 버튼, 검색창이 보인다 (시트가 다른 요소를 가리지 않음)', async () => {
    render(<App />);
    expect(screen.getByLabelText('0개 도시, 0개국 방문')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프로필' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /어디 다녀오셨어요/ })).toBeInTheDocument();
  });
});

describe('홈 시트', () => {
  it('손잡이를 누르면 단계가 바뀐다', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<App />);
    const handle = screen.getByRole('button', { name: /시트 크기 바꾸기/ });
    expect(handle).toHaveAccessibleName('시트 크기 바꾸기 (지금: 접힘)');
    fireEvent.click(handle);
    expect(screen.getByRole('button', { name: /시트 크기 바꾸기/ })).toHaveAccessibleName(
      '시트 크기 바꾸기 (지금: 반쯤 펼침)',
    );
  });
});
