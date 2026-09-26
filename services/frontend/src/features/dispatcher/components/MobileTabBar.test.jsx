import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileTabBar from './MobileTabBar';

describe('MobileTabBar', () => {
  it('renders all three mobile tabs with correct labels', () => {
    render(<MobileTabBar activeTab="map" onTabChange={() => {}} />);
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /incidents/i })).toBeInTheDocument();
  });

  it('renders badges when counts are greater than 0', () => {
    render(<MobileTabBar activeTab="map" onTabChange={() => {}} candidateCount={5} incidentCount={12} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onTabChange with correct tab id when tapped', () => {
    const onTabChange = vi.fn();
    render(<MobileTabBar activeTab="map" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /incidents/i }));
    expect(onTabChange).toHaveBeenCalledWith('incidents');
  });
});
