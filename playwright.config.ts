import { defineConfig, devices } from '@playwright/test';

const mobile = { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

// e2e: 개발 서버를 띄워 실제 지도(WebGL)와 함께 확인한다. 클라우드 세션에서는 사전 설치된 Chromium 사용
// PWA(서비스 워커·오프라인)는 배포 빌드에서만 동작하므로 따로 vite preview로 확인한다
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  // 소프트웨어 WebGL이 무거워 동시에 돌리면 타이밍이 흔들린다
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testIgnore: /(pwa|cloud)\.spec\.ts/,
      use: { ...mobile, baseURL: 'http://localhost:5173' },
    },
    {
      // 클라우드 동기화: 모의 클라우드 서버(scripts/mock-cloud.ts)를 쓰는 개발 서버
      name: 'cloud',
      testMatch: /cloud\.spec\.ts/,
      use: { ...mobile, baseURL: 'http://localhost:5175' },
    },
    {
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { ...mobile, baseURL: 'http://localhost:4173' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npx tsx scripts/mock-cloud.ts 5199',
      url: 'http://localhost:5199/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        'VITE_CLOUD_MOCK_URL=http://localhost:5199 VITE_CACHE_DIR=node_modules/.vite-cloud npx vite --port 5175 --strictPort',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npx vite build --logLevel warn && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
