import { fireEvent, render, screen } from '@testing-library/react';

import { LoginButton } from './LoginButton';

jest.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const setIsNicknameModalOpen = jest.fn();
jest.mock('@/providers/User', () => ({
  useUserContext: () => ({
    isUserLoggedIn: false,
    setIsNicknameModalOpen,
    nickname: 'TestUser',
  }),
}));

describe('LoginButton', () => {
  beforeEach(() => {
    setIsNicknameModalOpen.mockClear();
  });

  it('renders "Login" when user is not logged in', () => {
    render(<LoginButton />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('calls setIsNicknameModalOpen when clicked (not logged in)', () => {
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Login'));
    expect(setIsNicknameModalOpen).toHaveBeenCalledWith(true);
  });
});
