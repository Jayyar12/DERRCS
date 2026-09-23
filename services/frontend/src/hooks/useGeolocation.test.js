import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

afterEach(() => {
  if (originalGeolocation) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocation);
  } else {
    delete navigator.geolocation;
  }
});

function mockGeolocation() {
  const requests = [];
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success, error) => requests.push({ success, error })),
    },
  });
  return requests;
}

describe('useGeolocation', () => {
  it('ignores a late GPS response after a map choice clears the request', () => {
    const requests = mockGeolocation();
    const { result } = renderHook(() => useGeolocation());

    act(() => { result.current.requestLocation(); });
    expect(result.current.loading).toBe(true);
    act(() => result.current.clearLocation());
    act(() => requests[0].success({ coords: { latitude: 8.54, longitude: 124.75 } }));
    expect(result.current.coordinates).toBeNull();
    expect(result.current.loading).toBe(false);

    act(() => { result.current.requestLocation(); });
    act(() => requests[1].success({ coords: { latitude: 8.54, longitude: 124.75 } }));
    expect(result.current.coordinates).toEqual({ lat: 8.54, lng: 124.75 });
  });

  it('reports denied permission and invalid GPS data without attaching coordinates', () => {
    const requests = mockGeolocation();
    const { result } = renderHook(() => useGeolocation());

    act(() => { result.current.requestLocation(); });
    act(() => requests[0].error({ code: 1 }));
    expect(result.current.error).toMatch(/permission was denied/i);
    expect(result.current.loading).toBe(false);

    act(() => { result.current.requestLocation(); });
    act(() => requests[1].success({ coords: { latitude: Number.NaN, longitude: 124.75 } }));
    expect(result.current.coordinates).toBeNull();
    expect(result.current.error).toMatch(/invalid coordinates/i);
  });
});
