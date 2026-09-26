import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="Reported" />);
    expect(screen.getByText('Reported')).toBeInTheDocument();
  });

  it.each([
    ['Reported', 'bg-warning text-warning-foreground'],
    ['Validated', 'bg-primary text-primary-foreground'],
    ['Dispatched', 'bg-secondary text-secondary-foreground'],
    ['Active', 'bg-destructive text-destructive-foreground'],
    ['Resolved', 'bg-success text-success-foreground'],
    ['Closed', 'bg-muted text-muted-foreground'],
  ])('applies correct classes for status %s', (status, expectedClasses) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(status);
    const classes = expectedClasses.split(' ');
    classes.forEach(cls => {
      expect(badge).toHaveClass(cls);
    });
  });
});
