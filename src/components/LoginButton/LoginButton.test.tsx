import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginButton } from './LoginButton';

vi.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/hooks/useClickOutside', () => ({
  useClickOutside: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('calls setIsLoginModalOpen when clicked (not logged in)', () => {
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Login'));
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
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('shows "My Streams" option for admin users', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    expect(screen.getByText('My Streams')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('does not show "My Streams" option for regular users', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = false;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    expect(screen.queryByText('My Streams')).not.toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('calls logout when disconnect clicked', () => {
    mockUserContext.isUserLoggedIn = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('Disconnect'));
    expect(logout).toHaveBeenCalled();
  });

  it('navigates to stream manager when "My Streams" clicked', () => {
    mockUserContext.isUserLoggedIn = true;
    mockUserContext.isAdmin = true;
    render(<LoginButton />);
    fireEvent.click(screen.getByText('TestUser'));
    fireEvent.click(screen.getByText('My Streams'));
    expect(mockNavigate).toHaveBeenCalledWith('/manage');
  });
});
