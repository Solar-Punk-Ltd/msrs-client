import { fireEvent, render, screen } from '@testing-library/react';

import { LoginButton } from './LoginButton';

jest.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const setIsLoginModalOpen = jest.fn();
jest.mock('@/providers/User', () => ({
  useUserContext: () => ({
    isUserLoggedIn: false,
    setIsLoginModalOpen,
    nickname: 'TestUser',
  }),
}));

describe('LoginButton', () => {
  beforeEach(() => {
    setIsLoginModalOpen.mockClear();
  });

  it('renders "Login" when user is not logged in', () => {
    render(<LoginButton />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('calls setIsLoginModalOpen when clicked (not logged in)', () => {
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Login'));
    expect(setIsLoginModalOpen).toHaveBeenCalledWith(true);
  });
});
