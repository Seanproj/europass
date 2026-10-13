# Euro Passport — Claude Code 작업 규칙

독일 거주자가 유럽 도시를 방문할 때마다 도장을 모으는 여행 기록 PWA.
핵심 경험: **안개 덮인 유럽 지도에서 방문한 도시 주변만 상세 지도가 열린다.**

## 꼭 읽을 문서
- `docs/DESIGN_REVIEW.md` — 디자인 시스템(토큰, 타이포, 도장 규칙)과 정보 구조. UI 작업 전 필독
- `docs/DEVELOPMENT_PROMPTS.md` — 단계별 개발 계획. 진행 중인 Phase의 범위를 벗어나지 말 것
- `docs/design/concept.html` — 시각 시안

## 현재 상태
- v0: 루트의 정적 사이트(index.html, js/, css/, vendor/). Phase 1에서 `legacy/v0/`로 이동
- v1 목표 스택: Vite + React + TypeScript(strict), zustand, dexie, maplibre-gl(OpenFreeMap),
  vaul, motion, lucide-react, CSS Modules + `src/styles/tokens.css`, vitest, Playwright

## 명령어 (v1, Phase 1 이후)
```
npm run dev        # 개발 서버
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # 프로덕션 빌드 (dist/)
npx playwright test
```

## UX 원칙 (어기지 말 것)
- 화면은 **지도 1개 + 바텀시트 1개 + 프로필 페이지 1개**. 탭바, 필터 칩 여러 개, 모달 남발 금지
- 체크인 필수 입력은 0개. 메모, 사진, 날짜는 나중에 덧붙이는 선택 사항
- 파괴적 동작(삭제)은 확인을 받고, 체크인은 확인 대신 "되돌리기" 토스트로 처리

## 디자인 규칙
- 색, 간격, 라운드, 그림자는 반드시 `tokens.css` 변수 사용. 하드코딩 hex 금지 (지도 스타일 생성 코드는 토큰 값을 import)
- 포인트 컬러는 `--accent` 하나뿐
- **UI에 이모지 사용 금지** → lucide-react 아이콘. 국기는 `<Flag>` 컴포넌트(flag-icons SVG)
- 서체: Pretendard(전체), JetBrains Mono(도장 텍스트만)
- 라이트/다크 모두 확인. 360px 폭에서 가로 스크롤 금지. 터치 영역 44px 이상

## 코드 규칙
- UI 문구는 한국어, 코드 식별자는 영어, 주석은 한국어로 간결하게
- 기능은 `src/features/<name>/`에 모으고, 컴포넌트는 기능 폴더 안에서 시작해 재사용될 때만 `src/components/`로 이동
- 도시 데이터(`src/data/cities.json`)는 스크립트로만 생성. 손으로 수정하지 말고 `data/*.csv`의 override를 쓸 것
- **사용자 데이터 보존이 최우선**: Dexie 스키마를 바꿀 때는 버전을 올리고 마이그레이션 + 테스트 필수

## 작업 흐름
1. `main`에서 `phase-N-<slug>` 브랜치 생성 (Phase 외 작업은 `fix/<slug>`, `feat/<slug>`)
2. 구현 → `lint`, `typecheck`, `test`, `build` 모두 통과
3. UI 변경은 Playwright로 모바일(390x844)과 데스크톱 스크린샷을 찍어 직접 확인
4. 커밋 메시지는 한국어 또는 영어, 한 줄 요약 + 필요시 본문
5. PR을 열고 본문에 변경 사항, 확인 방법, 스크린샷 설명을 적는다. 머지하면 Pages에 자동 배포
6. Phase가 끝나면 `docs/DEVELOPMENT_PROMPTS.md`의 진행 현황 체크박스를 같은 PR에서 갱신

## 환경 메모
- 클라우드 세션은 네트워크 정책 때문에 일부 CDN과 타일 서버가 막힐 수 있음. npm registry는 허용됨.
  외부 리소스는 npm 패키지로 설치해서 번들하는 쪽을 우선
- Playwright는 사전 설치된 Chromium 사용 (`playwright install` 실행 금지)
