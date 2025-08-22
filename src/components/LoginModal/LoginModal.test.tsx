import { act, fireEvent, render, screen } from '@testing-library/react';

import { LoginModal } from './LoginModal';

jest.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonVariant: { SECONDARY: 'secondary' },
}));

const loginAsUser = jest.fn();
const loginAsAdmin = jest.fn();
const setIsLoginModalOpen = jest.fn();

jest.mock('@/providers/User', () => ({
  useUserContext: () => ({
    nickname: 'TestNick',
    loginAsUser,
    loginAsAdmin,
    setIsLoginModalOpen,
    keys: { private: '', public: '' },
    isUserLoggedIn: false,
    isAdmin: false,
    isLoginModalOpen: true,
  }),
}));

describe('LoginModal', () => {
  beforeEach(() => {
    loginAsUser.mockClear();
    loginAsAdmin.mockClear();
    setIsLoginModalOpen.mockClear();
  });

  it('renders modal with input and buttons', () => {
    render(<LoginModal />);
    expect(screen.getByText(/Please add your nickname/i)).toBeInTheDocument();
    expect(screen.getByText(/Nickname:/i)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls setIsLoginModalOpen when Cancel is clicked', () => {
    render(<LoginModal />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(setIsLoginModalOpen).toHaveBeenCalledWith(false);
  });

  it('calls loginAsUser and setIsLoginModalOpen when OK is clicked with valid name', async () => {
    render(<LoginModal />);
    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'NewNick' } });
      fireEvent.click(screen.getByText('OK'));

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(loginAsUser).toHaveBeenCalledWith('NewNick');
    expect(setIsLoginModalOpen).toHaveBeenCalledWith(false);
  });

  it('does not call loginAsUser if name is empty', () => {
    render(<LoginModal />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('OK'));
    expect(loginAsUser).not.toHaveBeenCalled();
  });

  it('does not call loginAsUser if name is too long', () => {
    render(<LoginModal />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'a'.repeat(21) } });
    fireEvent.click(screen.getByText('OK'));
    expect(loginAsUser).not.toHaveBeenCalled();
  });

  it('can switch to admin mode', () => {
    render(<LoginModal />);
    fireEvent.click(screen.getByText('Admin Login'));
    expect(screen.getByText(/Enter your admin credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Username:/i)).toBeInTheDocument();
    expect(screen.getByText(/Password:/i)).toBeInTheDocument();
  });

  it('can switch back to nickname mode', () => {
    render(<LoginModal />);
    fireEvent.click(screen.getByText('Admin Login'));
    fireEvent.click(screen.getByText('Nickname Login'));
    expect(screen.getByText(/Please add your nickname/i)).toBeInTheDocument();
  });

  it('shows error when trying to admin login with empty credentials', async () => {
    render(<LoginModal />);
    fireEvent.click(screen.getByText('Admin Login'));

    await act(async () => {
      fireEvent.click(screen.getByText('Login'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Please enter both username and password/i)).toBeInTheDocument();
    expect(loginAsAdmin).not.toHaveBeenCalled();
  });

  it('shows error when nickname is invalid', async () => {
    render(<LoginModal />);
    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByText('OK'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Nickname must be between 1 and 20 characters/i)).toBeInTheDocument();
  });
});
