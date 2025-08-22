import { TextDecoder, TextEncoder } from 'util';

import '@testing-library/jest-dom/vitest';

// TextEncoder/TextDecoder polyfill for Node.js
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as any;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any;
}

// Mock IntersectionObserver for emoji-picker-react
(global as any).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
