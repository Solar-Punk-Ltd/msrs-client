import { render } from '@testing-library/react';

import { InputLoading } from './InputLoading';

describe('InputLoading', () => {
  it('has the correct id on the container', () => {
    render(<InputLoading />);
    expect(document.getElementById('chat-input-loading')).toBeInTheDocument();
  });
});
