import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginButton } from './LoginButton';

vi.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/hooks/useClickOutside', () => ({
  useClickOutside: vi.fn(),
}));

vi.mock('../ConfirmationModal/ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onCancel, title, message, confirmText, cancelText }: any) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onCancel}>{cancelText}</button>
      </div>
    ) : null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the routes
vi.mock('@/routes', () => ({
  ROUTES: {
    STREAM_BROWSER: '/browse',
    STREAM_MANAGER: '/manage',
    STAMP_DASHBOARD: '/stamps',
  },
}));

const setIsLoginModalOpen = vi.fn();
const logout = vi.fn();

const mockUserContext = {
  isUserLoggedIn: false,
  setIsLoginModalOpen,
  nickname: 'TestUser',
  logout,
  isAdmin: false,
};

vi.mock('@/providers/User', () => ({
  useUserContext: () => mockUserContext,
}));

const mockSetTheme = vi.fn();
vi.mock('@/providers/Theme', () => ({
  useTheme: () => ({
    theme: 'solarpunk',
    setTheme: mockSetTheme,
  }),
}));

describe('LoginButton', () => {
  beforeEach(() => {
    setIsLoginModalOpen.mockClear();
    logout.mockClear();
    mockNavigate.mockClear();
    mockUserContext.isUserLoggedIn = false;
    mockUserContext.isAdmin = false;
  });

  it('renders "Login" when user is not logged in', () => {
    render(<LoginButton />);
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('calls setIsLoginModalOpen when clicked (not logged in)', () => {
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Log in'));
    expect(setIsLoginModalOpen).toHaveBeenCalledWith(true);
  });

  it('renders nickname when user is logged in', () => {
    mockUserContext.isUserLoggedIn = true;
    render(<LoginButton />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('shows dropdown when nickname clicked (logged in)', () => {
    mockUserContext.isUserLoggedIn = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(screen.getByText('Browse streams')).toBeInTheDocument();
  });

  it('shows "My Streams" and "My Stamps" options for admin users', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    expect(screen.getByText('My Streams')).toBeInTheDocument();
    expect(screen.getByText('My Stamps')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('does not show "My Streams" and "My Stamps" options for regular users', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = false;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    expect(screen.queryByText('My Streams')).not.toBeInTheDocument();
    expect(screen.queryByText('My Stamps')).not.toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('shows confirmation modal when regular user clicks Logout', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = false;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Log out'));

    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled(); // Should not be called immediately
  });

  it('calls logout directly when admin user clicks Logout', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/browse');
  });

  it('calls logout when confirmation modal is confirmed', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = false;
    render(<LoginButton />);

    // Open dropdown and click logout
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Log out'));

    // Confirm logout in modal
    fireEvent.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/browse');
  });

  it('does not logout when confirmation modal is cancelled', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = false;
    render(<LoginButton />);

    // Open dropdown and click logout
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Log out'));

    // Cancel logout in modal
    fireEvent.click(screen.getByText('Cancel'));

    expect(logout).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  it('navigates to stream manager when "My Streams" clicked', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('My Streams'));
    expect(mockNavigate).toHaveBeenCalledWith('/manage');
  });

  it('navigates to stream browser when "Stream Browser" clicked', () => {
    mockUserContext.isUserLoggedIn = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Browse streams'));
    expect(mockNavigate).toHaveBeenCalledWith('/browse');
  });

  it('navigates to stamp dashboard when "My Stamps" clicked', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('My Stamps'));
    expect(mockNavigate).toHaveBeenCalledWith('/stamps');
  });
});
