import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders section headings', () => {
    render(<Footer />);
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Newsletter')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('renders community links with correct hrefs', () => {
    render(<Footer />);
    expect(screen.getByText('Discord').closest('a')).toHaveAttribute('href', 'https://discord.com/invite/hyCr9BMX9U');
    expect(screen.getByText('GitHub').closest('a')).toHaveAttribute('href', 'https://github.com/ethersphere');
    expect(screen.getByText('X (Twitter)').closest('a')).toHaveAttribute('href', 'https://x.com/ethswarm');
  });

  it('renders newsletter form with required email input', () => {
    render(<Footer />);
    const input = screen.getByPlaceholderText('Enter your email address');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
  });

  it('renders the current year in the copyright', () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(`Swarm Foundation, ${new Date().getFullYear()}`))).toBeInTheDocument();
  });
});
