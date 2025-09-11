import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotFound } from './NotFound';

describe('NotFound', () => {
  const renderNotFound = () =>
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

  it('renders 404 error message', () => {
    renderNotFound();

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText(/page you're looking for doesn't exist/)).toBeInTheDocument();
  });

  it('renders link to home page', () => {
    renderNotFound();

    const homeLink = screen.getByRole('link', { name: 'Go Back Home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('has proper CSS classes for styling', () => {
    renderNotFound();

    expect(document.querySelector('.not-found')).toBeInTheDocument();
    expect(document.querySelector('.not-found__content')).toBeInTheDocument();
    expect(document.querySelector('.not-found__title')).toBeInTheDocument();
    expect(document.querySelector('.not-found__subtitle')).toBeInTheDocument();
    expect(document.querySelector('.not-found__message')).toBeInTheDocument();
    expect(document.querySelector('.not-found__link')).toBeInTheDocument();
  });
});
