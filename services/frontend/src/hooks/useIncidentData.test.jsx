import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useIncidentData } from './useIncidentData';

vi.mock('../api/client', () => ({
  api: {
    candidates: vi.fn(),
    incidents: vi.fn(),
    reports: vi.fn(),
  },
}));

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe('useIncidentData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('coalesces refreshes and never commits data from a read superseded by a refresh', async () => {
    const firstRead = deferred();
    api.candidates.mockReturnValueOnce(firstRead.promise).mockResolvedValueOnce([{ id: 'new-candidate' }]);
    api.incidents.mockResolvedValue([]);
    api.reports.mockResolvedValue([]);

    const { result } = renderHook(() => useIncidentData());
    await waitFor(() => expect(api.candidates).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.refresh();
      result.current.refresh();
    });
    expect(api.candidates).toHaveBeenCalledTimes(1);

    await act(async () => firstRead.resolve([{ id: 'stale-candidate' }]));

    await waitFor(() => {
      expect(api.candidates).toHaveBeenCalledTimes(2);
      expect(result.current.candidates).toEqual([{ id: 'new-candidate' }]);
      expect(result.current.loading).toBe(false);
    });
    expect(api.incidents).toHaveBeenCalledTimes(2);
    expect(api.reports).toHaveBeenCalledTimes(2);
  });

  it('refreshes a visible dashboard when its tab receives focus', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    api.candidates.mockResolvedValue([]);
    api.incidents.mockResolvedValue([]);
    api.reports.mockResolvedValue([]);

    const { unmount } = renderHook(() => useIncidentData());
    await waitFor(() => expect(api.candidates).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);
    await waitFor(() => expect(api.candidates).toHaveBeenCalledTimes(2));

    unmount();
    visibility.mockRestore();
  });
});
