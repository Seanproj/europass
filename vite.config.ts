/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // GitHub Pages 하위 경로(/Euro_Travel/)에서도 동작하도록 상대 경로
  base: './',
  plugins: [react()],
  // e2e가 실행 중에 쓰는 결과 파일(스크린샷, 백업 zip) 때문에 개발 서버가 페이지를 새로고침하지 않게
  server: { watch: { ignored: ['**/test-results/**', '**/playwright-report/**'] } },
  // 앱 정보 화면의 버전
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e는 Playwright로 따로 실행
    exclude: ['**/node_modules/**', 'e2e/**'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
