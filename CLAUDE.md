# Euro Passport — Claude Code 작업 규칙

독일 거주자가 유럽 도시를 방문할 때마다 도장을 모으는 여행 기록 PWA.
핵심 경험: **안개 덮인 유럽 지도에서 방문한 도시 주변만 상세 지도가 열린다.**

## 꼭 읽을 문서
- `docs/DESIGN_REVIEW.md` — 디자인 시스템(토큰, 타이포, 도장 규칙)과 정보 구조. UI 작업 전 필독
- `docs/DEVELOPMENT_PROMPTS.md` — 단계별 개발 계획. 진행 중인 Phase의 범위를 벗어나지 말 것
- `docs/design/concept.html` — 시각 시안 / `docs/design/refs/` — 레퍼런스 이미지 (화면 작업의 시각 기준)

## 현재 상태
- v1: Vite + React 19 + TypeScript 6(strict) 앱이 루트에 있음 (Phase 5 완료: 시트 탐색 · 방문 히스토리)
- 체크인은 `src/features/checkin/`(검색·`checkIn()`·되돌리기 토스트), 도장은 `src/components/Stamp`(모양은 도시 id 해시, 각도는 방문 id 해시).
  화면 사이 신호(시트 상태, 화면 경로, 토스트, 도장 연출)는 `src/app/store.ts` 하나로 주고받는다.
  시트 화면 이동은 `src/app/nav.ts`의 `navigate()`/`goBack()`만 쓴다 (URL ?country=, ?city=와 브라우저 뒤로가기를 맞춤)
- 도시 id는 `"cz-prague"` 형식. 조회는 `src/data/cities.ts`, 국기는 `src/components/Flag`, 국기 퍼즐 도형은 `src/data/flags.ts`
- v0: `legacy/v0/`에 보관. 배포 시 `/v0/`로 함께 올라가고, v0 기록은 v1 첫 실행 때 자동으로 옮겨짐
- 스택: zustand, dexie(+dexie-react-hooks), maplibre-gl(OpenFreeMap, Phase 3), motion, lucide-react,
  CSS Modules + `src/styles/tokens.css`, vitest, Playwright
- 바텀시트는 motion 기반 자체 구현(`src/features/collection/BottomSheet.tsx`). vaul은 Radix Dialog 기반이라
  상시 열린 비모달 시트에서도 포커스를 가두고 나머지 화면을 스크린리더에서 숨겨서 쓰지 않음
- 지도(`src/features/map/`): 지도 인스턴스는 `MapController` 하나. 안개는 2D 캔버스를 텍스처로 올리는 커스텀 레이어(`fog/`),
  렌즈·도시명 태그는 지도 위 오버레이 캔버스, 나라 태그만 DOM. 색은 `tokens.ts`가 tokens.css에서 읽는다.
  개발 서버에서는 `window.__map`, `window.__db`로 카메라와 DB를 조작할 수 있음 (Playwright 확인용)
- 클라우드 환경의 Allowed domains에 tiles.openfreemap.org를 추가해 둠. 타일 서버에 닿지 않으면 지도는 최소 스타일(배경 + 국기 퍼즐 육지)로 뜬다
- TypeScript 7은 typescript-eslint가 아직 지원하지 않아 6.0 사용

## 명령어 (v1, Phase 1 이후)
```
npm run dev        # 개발 서버
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # 프로덕션 빌드 (dist/)
npx playwright test # e2e (npm run e2e). 개발 서버를 띄우고 사전 설치된 Chromium 사용
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
- DB 테스트는 파일 맨 위에 `// @vitest-environment node` (jsdom의 Blob은 fake-indexeddb에 저장되지 않음)
- 기능은 `src/features/<name>/`에 모으고, 컴포넌트는 기능 폴더 안에서 시작해 재사용될 때만 `src/components/`로 이동
- 도시 데이터(`src/data/cities.json`, `regions*.json`)는 스크립트로만 생성(`npm run data:cities`). 손으로 수정하지 말고 `data/*.csv`의 override를 쓸 것.
  프록시 환경에서 Node fetch는 `NODE_USE_ENV_PROXY=1`이 필요 (npm 스크립트에 포함)
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
