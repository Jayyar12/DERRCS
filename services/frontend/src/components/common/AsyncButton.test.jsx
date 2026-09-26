import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AsyncButton from './AsyncButton';

describe('AsyncButton', () => {
  it('renders children when not loading', () => {
    render(<AsyncButton>Submit Report</AsyncButton>);
    expect(screen.getByRole('button', { name: /submit report/i })).toBeInTheDocument();
  });

  it('renders spinner and disables button when loading', () => {
    render(<AsyncButton loading loadingText="Submitting...">Submit Report</AsyncButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<AsyncButton onClick={handleClick}>Click Me</AsyncButton>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
