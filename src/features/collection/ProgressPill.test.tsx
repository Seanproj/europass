import { render, screen } from '@testing-library/react';
import { ProgressPill } from './ProgressPill';

describe('ProgressPill', () => {
  it('도시 수와 나라 수를 보여준다', () => {
    render(<ProgressPill cities={23} countries={9} />);
    expect(screen.getByLabelText('23개 도시, 9개국 방문')).toHaveTextContent('23개 도시');
    expect(screen.getByLabelText('23개 도시, 9개국 방문')).toHaveTextContent('9개국');
  });
});
