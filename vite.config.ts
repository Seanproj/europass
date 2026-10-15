/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import pkg from './package.json' with { type: 'json' };
import { lightToken } from './scripts/lib/tokens.ts';

const BG = lightToken('--bg');

export default defineConfig({
  // GitHub Pages 하위 경로(/europass/)에서도 동작하도록 상대 경로
  base: './',
  // e2e에서 개발 서버를 둘 띄울 때(클라우드 모의) 의존성 캐시가 겹치지 않게
  ...(process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {}),
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      // 새 버전은 사용자가 "새로고침"을 누를 때 적용 (main.tsx에서 등록)
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Euro Passport',
        short_name: 'Euro Passport',
        description: '유럽 도시마다 도장을 모으는 여행 여권 — 탭 한 번에 찍고, 모을수록 안개 지도가 열린다',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: BG,
        theme_color: BG,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Pretendard 한글 조각(약 3MB)은 쓰일 때 캐시. 분석 리포트는 제외
        globIgnores: ['**/PretendardVariable*.woff2', 'stats.html'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
    // ANALYZE=1 npm run build → dist/stats.html (번들 구성)
    ...(process.env.ANALYZE
      ? [visualizer({ filename: 'dist/stats.html', gzipSize: true }) as PluginOption]
      : []),
  ],
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
