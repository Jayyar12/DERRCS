import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useIncidentReview } from './useIncidentReview';

describe('useIncidentReview', () => {
  it('preserves unrelated query parameters while changing and clearing review targets', () => {
    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/dispatcher?filter=active']}>
        {children}
      </MemoryRouter>
    );
    const { result } = renderHook(() => ({ review: useIncidentReview(), location: useLocation() }), { wrapper });

    act(() => result.current.review.openCandidate('cand-1'));
    expect(result.current.location.search).toBe('?filter=active&review=candidate%3Acand-1');
    expect(result.current.review.selection).toEqual({ type: 'candidate', id: 'cand-1' });

    act(() => result.current.review.openIncident('inc-1'));
    expect(result.current.location.search).toBe('?filter=active&review=incident%3Ainc-1');

    act(() => result.current.review.clearSelection());
    expect(result.current.location.search).toBe('?filter=active');
  });
});
