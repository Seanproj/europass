// Lighthouse CI (모바일 기본 설정): 빌드 결과(dist/)를 정적 서버로 띄워 3번 재고 중간값으로 판정
// Lighthouse 12부터 PWA 항목이 빠져서, 설치·오프라인은 e2e/pwa.spec.ts로 확인한다
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost/index.html'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        // 목표 90. 지금은 WebGL 지도 시작(소프트웨어 렌더링 + CPU 4배 감속)이 TBT를 크게 잡아 경고로 둔다 (PR 본문 참고)
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './lhci-report' },
  },
};
