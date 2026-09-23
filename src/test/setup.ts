import { TextDecoder, TextEncoder } from 'util';
import { vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

// The runtime config reads these at import time and throws when one is missing, so a run without a
// local .env (the verification box has none) failed to load four test files. Inert values fill the
// gaps. A developer's own .env still wins wherever it sets a value.
const TEST_ENV_DEFAULTS: Record<string, string> = {
  VITE_READER_BEE_URL: 'http://reader.test',
  VITE_WRITER_BEE_URL: 'http://writer.test',
  VITE_STAMP: '1'.repeat(64),
  VITE_STREAM_STATE_OWNER: '1'.repeat(40),
  VITE_STREAM_STATE_TOPIC: 'test-stream-state',
  VITE_CHAT_GSOC_RESOURCE_ID: '1'.repeat(64),
  VITE_CHAT_GSOC_TOPIC: 'test-chat',
  VITE_STREAMER_GSOC_RESOURCE_ID: '1'.repeat(64),
  VITE_STREAMER_GSOC_TOPIC: 'test-streamer',
  VITE_WAKU_STATIC_PEER: '/dns4/waku.test/tcp/443/wss/p2p/test',
  VITE_REGISTER_TOPIC: 'test-register',
};

for (const [name, value] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!import.meta.env[name]) vi.stubEnv(name, value);
}

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

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });
