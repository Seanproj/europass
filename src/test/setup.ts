import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom에 없는 브라우저 API (vaul 바텀시트가 사용)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
