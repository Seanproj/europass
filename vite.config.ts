/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages 하위 경로(/Euro_Travel/)에서도 동작하도록 상대 경로
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e는 Playwright로 따로 실행
    exclude: ['**/node_modules/**', 'e2e/**'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
