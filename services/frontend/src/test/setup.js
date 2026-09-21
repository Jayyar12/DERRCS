import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfill ResizeObserver for jsdom environment (required by react-resizable-panels)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill matchMedia for jsdom environment
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill Element.prototype.getAnimations for Base UI ScrollArea
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  Element.prototype.getAnimations = function () {
    return [];
  };
}

afterEach(() => {
  cleanup();
});
