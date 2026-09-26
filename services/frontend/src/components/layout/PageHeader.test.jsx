import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  const renderHeader = (props) => render(
    <MemoryRouter>
      <PageHeader {...props} />
    </MemoryRouter>
  );

  it('renders the header element', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders children (actions) correctly', () => {
    renderHeader({ children: <button>Logout</button> });
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('applies staff variant styling by default', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-card', 'border-b');
  });

  it('applies public variant styling when specified', () => {
    const { container } = renderHeader({ variant: 'public' });
    const header = container.querySelector('header');
    expect(header).toHaveClass('backdrop-blur', 'bg-background/95');
  });
});
