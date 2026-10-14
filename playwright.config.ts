import { defineConfig, devices } from '@playwright/test';

// e2e: 개발 서버를 띄워 실제 지도(WebGL)와 함께 확인한다. 클라우드 세션에서는 사전 설치된 Chromium 사용
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // 소프트웨어 WebGL이 무거워 동시에 돌리면 타이밍이 흔들린다
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
