import { fireEvent, render, screen } from '@testing-library/react';

import { LoginModal } from './LoginModal';

jest.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonVariant: { SECONDARY: 'secondary' },
}));

const setNickname = jest.fn();
const setIsUserLoggedIn = jest.fn();
jest.mock('@/providers/User', () => ({
  useUserContext: () => ({
    nickname: 'TestNick',
    setNickname,
    setIsUserLoggedIn,
  }),
}));

describe('LoginModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    setNickname.mockClear();
    setIsUserLoggedIn.mockClear();
    onClose.mockClear();
  });

  it('renders modal with input and buttons', () => {
    render(<LoginModal onClose={onClose} />);
    expect(screen.getByText(/Please add your nickname/i)).toBeInTheDocument();
    expect(screen.getByText(/Nickname:/i)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<LoginModal onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls setNickname, setIsUserLoggedIn, and onClose when OK is clicked with valid name', () => {
    render(<LoginModal onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'NewNick' } });
    fireEvent.click(screen.getByText('OK'));
    expect(setNickname).toHaveBeenCalledWith('NewNick');
    expect(setIsUserLoggedIn).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call setNickname or setIsUserLoggedIn if name is empty', () => {
    render(<LoginModal onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('OK'));
    expect(setNickname).not.toHaveBeenCalled();
    expect(setIsUserLoggedIn).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call setNickname or setIsUserLoggedIn if name is too long', () => {
    render(<LoginModal onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'a'.repeat(21) } });
    fireEvent.click(screen.getByText('OK'));
    expect(setNickname).not.toHaveBeenCalled();
    expect(setIsUserLoggedIn).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
