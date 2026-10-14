# 단계별 개발 프롬프트

Claude Code에 **한 단계씩** 붙여 넣어 개발하는 문서입니다.
각 단계는 독립된 브랜치와 PR로 진행하고, 머지하면 GitHub Pages에 자동 배포됩니다.

## 사용법

**가장 쉬운 방법:** Claude Code에서 슬래시 명령을 입력하세요.

```
/phase 1
```

`.claude/commands/phase.md`가 이 문서에서 해당 단계를 찾아 브랜치 생성 → 구현 → 검증 → PR까지 진행합니다.
직접 붙여 넣고 싶다면 아래 각 단계의 `프롬프트` 블록을 그대로 복사하면 됩니다.

**진행 원칙**

- 한 세션에서 한 단계만 진행하세요. 컨텍스트가 짧을수록 토큰이 적게 들고 결과도 정확합니다.
- 단계가 끝나면 PR을 확인하고 머지한 뒤, 새 세션에서 다음 단계를 시작하세요.
- 결과가 마음에 들지 않으면 같은 브랜치에서 "○○를 이렇게 바꿔줘"처럼 짧게 수정을 요청하세요.
- 모든 단계는 [`CLAUDE.md`](../CLAUDE.md)의 규칙과 [`DESIGN_REVIEW.md`](DESIGN_REVIEW.md)의 디자인 시스템을 따릅니다.
- 화면 작업(Phase 3~7)은 `docs/design/concept.html`과 `docs/design/refs/*.jpg`를 시각 기준으로 삼습니다.

## 진행 현황

- [x] Phase 0 — 저장소 환경 세팅
- [x] Phase 1 — 기술 기반 & 앱 골격
- [x] Phase 2 — 유럽 도시 데이터 (600+ 도시)
- [x] Phase 3 — 안개 지도
- [x] Phase 4 — 원탭 체크인 & 도장 v2
- [x] Phase 5 — 바텀시트 탐색 (나라 → 도시 → 기록)
- [x] Phase 6 — 프로필 · 배지 · 백업
- [x] Phase 7 — 공유 카드 & 연말 결산
- [x] Phase 8 — PWA · 오프라인 · 품질
- [x] Phase 9 — (선택) 클라우드 동기화 & 공개 프로필

---

## Phase 0 — 저장소 환경 세팅 ✅

이미 완료된 단계입니다.

- `main` 브랜치 생성, 단계별 `phase-N-*` 브랜치에서 PR로 머지하는 흐름
- GitHub Actions: PR마다 검사(`ci.yml`), `main`에 머지하면 Pages 배포(`deploy.yml`). `package.json` 유무를 감지해 v0 정적 사이트와 v1 빌드를 모두 지원
- `CLAUDE.md`(프로젝트 규칙), `.claude/settings.json`(자주 쓰는 명령 허용, 클라우드 세션 시작 시 자동 `npm install`), `/phase` 명령
- 디자인 리뷰 문서와 시각 시안

---

## Phase 1 — 기술 기반 & 앱 골격

**브랜치** `phase-1-foundation`
**목표** v0 정적 앱을 Vite + React + TypeScript로 옮기고, 디자인 토큰과 "지도 풀스크린 + 바텀시트" 골격을 만든다. 기존 사용자 데이터는 반드시 보존한다.

```text
Phase 1을 진행해줘. CLAUDE.md와 docs/DESIGN_REVIEW.md를 먼저 읽어.

목표: v0(루트의 index.html, js/, css/)를 Vite + React + TypeScript 앱으로 재구성하고
v1의 기반과 화면 골격을 만든다.

1. 스택 (최신 안정 버전):
   - Vite, React, TypeScript(strict)
   - 상태: zustand / 저장소: dexie / 아이콘: lucide-react
   - 바텀시트: motion 기반 자체 구현 (vaul은 비모달 상시 시트에서 접근성 문제로 제외) / 애니메이션: motion
   - 테스트: vitest, @testing-library/react / 린트: eslint(flat config), prettier
   - 스타일: CSS Modules + src/styles/tokens.css(CSS 변수). Tailwind는 쓰지 않음
   - 폰트: pretendard 패키지(npm)를 self-host, 도장용 JetBrains Mono(@fontsource)
2. 폴더 구조: src/{app,components,features/{map,checkin,collection,profile},data,db,lib,styles}
   - v0 파일은 legacy/v0/ 로 옮겨 참고용으로 보관 (빌드 대상 아님)
   - vendor/ 는 Phase 3에서 maplibre로 대체되므로 삭제
3. 디자인 토큰: DESIGN_REVIEW.md 4장의 컬러, 타이포, 라운드, 그림자, 모션을 tokens.css로 정의.
   라이트/다크는 prefers-color-scheme로 자동 전환
4. 화면 골격 (아직 실제 지도 없이):
   - 풀스크린 지도 영역 (Phase 3 전까지는 --land 색 placeholder)
   - 좌상단 진행률 알약 "0개 도시 · 0개국", 우상단 프로필 버튼(원형)
   - 바텀시트: peek(검색창 "어디 다녀오셨어요?" + 국기 줄 자리) / half / full 3단계 snap
   - safe-area-inset 대응, 360px 폭에서도 가로 스크롤 없음
5. 데이터 계층 (src/db):
   - Dexie DB 'euro-passport-v1': visits(id, cityId, date, endDate?, note, photos[], createdAt, updatedAt), settings
     · 한 도시에 visit 여러 건 허용 (재방문 히스토리). 인덱스: cityId, date, [cityId+date]
     · src/db/selectors.ts: 고유 도시 수, 총 방문 수, 도시별 방문 목록(최신순), 머문 일수 계산 + 단위 테스트
   - v0 마이그레이션: 기존 IndexedDB 'euro-passport'(stores: visits, settings)가 있으면 1회 읽어서
     옮기고 settings에 migratedFromV0=true 기록. v0 cityId → v1 cityId 매핑 테이블은
     src/db/v0-city-map.ts에 둔다 (Phase 2에서 id 체계가 확정되므로 지금은 v0 id 그대로 보존)
   - v0 JSON 백업 파일(app:'euro-passport', version:1)도 읽을 수 있는 import 함수
   - 마이그레이션 단위 테스트 (fake-indexeddb 사용)
6. package.json 스크립트: dev, build, preview, lint, typecheck, test, format
   - vite base는 './' (GitHub Pages 하위 경로 대응)
7. .github/workflows의 ci.yml과 deploy.yml이 package.json을 감지해 자동으로 빌드하는지 확인

완료 기준: npm run lint && npm run typecheck && npm test && npm run build 모두 통과.
Playwright로 모바일(390x844)과 데스크톱(1280x800) 스크린샷을 찍어 라이트/다크 모두 확인하고
PR 본문에 무엇을 확인했는지 적어줘.
```

**완료 체크** 골격 화면이 라이트/다크로 뜨고, 기존 v0에서 찍은 기록이 사라지지 않음

---

## Phase 2 — 유럽 도시 데이터 (600+ 도시)

**브랜치** `phase-2-cities`
**목표** 나라마다 충분한 도시가 있는 데이터셋을 스크립트로 생성한다. 한글 이름, 등급, 국기까지 포함한다.

```text
Phase 2를 진행해줘. CLAUDE.md를 먼저 읽어.

목표: 유럽 45개국 내외, 600~900개 도시 데이터셋을 재현 가능한 스크립트로 만든다.

1. scripts/build-cities.ts (tsx로 실행, npm run data:cities):
   - 원천: GeoNames cities15000.zip (CC BY 4.0) — 유럽 국가만, 인구 50,000 이상
   - 큐레이션 추가: data/curated.csv에 인구는 적어도 여행지로 유명한 곳을 직접 추가
     (예: Hallstatt, Brugge, Rothenburg ob der Tauber, Giethoorn, Colmar, Cinque Terre(Monterosso),
      Positano, Český Krumlov, Bled, Kotor, Mostar, Sintra, Ronda, Mont-Saint-Michel, Zermatt,
      Grindelwald, Annecy, Lauterbrunnen, Eze, Matera, Alberobello, Plitvice, Tromsø, Lofoten(Svolvær) 등
      50곳 이상)
   - 한글 이름: Wikidata SPARQL로 GeoNames ID(P1566) → ko 라벨 조회. 없으면 data/ko-overrides.csv
     에서 보충하고, 그래도 없는 도시는 목록으로 출력해서 내가 확인할 수 있게 해줘
   - 등급(tier): 1 = 상징 도시(수도 + 대표 관광 도시, 약 120곳, data/tier1.txt로 관리)
                2 = 인구 10만 이상 또는 큐레이션 도시 / 3 = 나머지
   - 출력: src/data/cities.json
     { id: "cz-prague", name: {ko, en, local}, country: "CZ", lat, lon, population, tier, capital }
     id는 "국가코드-영문슬러그", 중복 시 지역명 접미사
   - 결과 json은 커밋한다 (앱 실행 시 네트워크 불필요). 원천 zip은 .gitignore
2. src/data/countries.json: ISO2, 한글명, 영문명, 권역(서/중부/남/동/북유럽, 영국·아일랜드, 발칸),
   국가 중심 좌표(라벨 위치용), 도시 수
3. 국기: flag-icons 패키지의 1x1 SVG를 사용하는 <Flag code="CZ" size={24} visited /> 컴포넌트
   (원형 클립, 미방문은 grayscale + 반투명)
4. v0 → v1 id 매핑: src/db/v0-city-map.ts 완성 (v0의 47개 id 전부 매핑, 테스트로 검증)
5. 국기 퍼즐 조각 (scripts/build-regions.ts, npm run data:regions) — docs/DESIGN_REVIEW.md "국기 퍼즐" 참고:
   - 나라마다 대표 도시(anchor)를 고름: tier1 + 인구 큰 tier2, 나라 크기에 따라 3~12곳 (data/anchors-override.csv로 조정 가능)
   - 나라 경계(Natural Earth 50m, world-atlas)를 anchor 기준 보로노이 분할 → 나라 경계로 잘라 조각 폴리곤 생성
     (d3-geo-voronoi 또는 d3-delaunay + @turf/intersect). 정확한 행정구역일 필요는 없음
   - 모든 도시에 regionId 부여 (자신이 속한 조각 = 가장 가까운 anchor, 같은 나라 안에서)
   - 국기 도형: src/data/flags.ts에 나라별 국기를 줄무늬/십자/삼각형 도형 목록으로 정의 (문장 생략)
   - 출력: src/data/regions.json { id: "de-munich", country: "DE", name: {ko: "뮌헨 지역"}, anchorCityId, polygon(단순화) }
     + 나라별 bbox. 국기 조각 폴리곤(국기 도형 ∩ 조각)은 미리 계산해 regions-flag.json으로 커밋
   - 테스트: 모든 도시가 regionId를 가짐, 조각은 나라 경계 안, 나라별 조각 수 3~12
6. 데이터 무결성 테스트: id 중복 없음, 좌표 범위, 모든 국가에 도시 3개 이상,
   tier1 개수 범위, ko 이름 누락률 2% 미만
7. 라이선스 표기: GeoNames, Wikidata(CC0), flag-icons를 README와 앱 정보 화면용 상수에 추가

완료 기준: npm run data:cities로 결과가 재생성되고, 테스트 통과, 국가별 도시 수 요약표를 PR 본문에 첨부.
네트워크 정책 때문에 GeoNames나 Wikidata 접속이 막히면 그 사실과 막힌 호스트를 알려주고 멈춰줘.
```

**완료 체크** `cities.json` 600개 이상, 한글명 누락 거의 없음, 국가별 도시 수 표 확인

---

## Phase 3 — 안개 지도

**브랜치** `phase-3-fog-map`
**목표** 앱의 핵심. 흑백 안개 지도 위에서 방문 도시 주변만 컬러 상세 지도로 열린다.

```text
Phase 3을 진행해줘. CLAUDE.md, docs/DESIGN_REVIEW.md 2장(컨셉), docs/design/concept.html을 먼저 읽어.

목표: MapLibre GL JS로 "안개 걷기" 지도를 구현한다.

1. 베이스맵: maplibre-gl + OpenFreeMap(무료, API 키 없음) 벡터 타일
   - 스타일은 https://tiles.openfreemap.org/styles/positron 을 기반으로
     src/features/map/style.ts에서 우리 토큰 색으로 덮어쓴 라이트/다크 스타일 생성
   - 라벨은 name:ko → name 순으로 표시 (["coalesce", ["get","name:ko"], ["get","name"]])
   - attribution 표기 (OpenFreeMap, OpenMapTiles, OpenStreetMap)
2. 안개 레이어 (src/features/map/fog/): 레퍼런스 docs/design/refs/01-home-fog.jpg 처럼 구름 질감 + 부드러운 가장자리
   - MapLibre 캔버스 위에 겹친 2D <canvas> 오버레이. map의 'render' 이벤트마다 다시 그림 (devicePixelRatio 대응)
   - 그리기 순서: (1) --fog 색을 투명도 0.55로 전체 채움 (2) 미리 만든 구름 텍스처(타일링되는 노이즈 PNG,
     scripts/build-fog-texture.ts로 생성해 커밋)를 지도 이동에 맞춰 패럴랙스로 그림
     (3) globalCompositeOperation='destination-out' + 방사형 그라데이션으로 방문 도시마다 구멍
   - 구멍 반경(px) = max(실제 반경을 화면 px로 변환한 값, 렌즈 최소 반경). 실제 반경은 tier1 18km, tier2 12km, tier3 8km
   - 재방문 보정: 반경 × (1 + 0.12 × min(방문수 - 1, 3)) — 자주 간 도시일수록 넓게 걷힘
   - 가장자리 번짐은 반경의 70%~100% 구간. 새 방문은 반경 0→목표 700ms ease-out
   - 다크 모드는 토큰 색으로 같은 방식
3. 렌즈 (z<8) — src/features/map/lens/:
   - 유럽 전체 화면에서는 실제 반경이 1~2px이라 보이지 않으므로, 방문 도시마다 지름 60~76px 원형 "렌즈"를 표시
   - 렌즈 내용 = 그 도시의 z13 상세 지도 스냅샷: 화면 밖 숨은 maplibre 인스턴스(preserveDrawingBuffer)로
     도시 중심 jumpTo → 'idle' 대기 → canvas.toBlob → Dexie 'lensCache'에 저장. 한 번에 하나씩 순차 생성
   - 표시: 스냅샷을 원형으로 잘라 가장자리를 번지게(방사형 마스크) 그림. 위에 도시명 태그(검정 반투명 알약, 홈 도시는 --accent).
     2번 이상 방문한 도시는 태그 오른쪽에 횟수 배지 (concept.html 01번 "프라하 3")
   - z7~8 구간에서 렌즈 → 실제 안개 구멍으로 크로스페이드 (opacity 보간)
   - 스냅샷 생성 실패(오프라인 등) 시 --d-bg 단색 + 도시 점으로 대체
4. 국기 퍼즐 레이어 (src/features/map/puzzle/) — concept.html "국기 퍼즐" 섹션이 기준:
   - Phase 2의 regions-flag.json을 GeoJSON source로 올리고, 방문한 조각만 필터로 표시하는 fill 레이어
     (색은 피처 속성의 국기 색, fill-opacity 0.92, 채도 보정은 색 생성 시 82%로 미리 적용)
   - 조각 경계: 칠한 조각은 흰 실선, 방문한 나라의 빈 조각은 점선(line-dasharray), 미방문 나라는 표시 안 함
   - 다크 모드: 국기의 검정은 --flag-black 토큰 값으로 치환
   - 레이어 순서: 바다·육지 → 안개 캔버스 → 국기 퍼즐 → 나라 경계 → 렌즈·태그
   - 새 조각이 칠해질 때 opacity 0→0.92 + 살짝 scale 애니메이션 400ms, 나라 완성 시 국기 전체 반짝임 1회
5. 나라 태그: z3~5.5에서 국가 라벨 위치에 원형 국기 + "5/12"(칠한 조각/전체). 다 채우면 "오스트리아 완성"(체크 아이콘).
   미방문 나라는 흑백 국기 + 이름만. 렌즈와 겹치면 숨김. 탭하면 해당 국가로 flyTo + 시트에 국가 상세
6. 도시 마커 (GeoJSON source + circle/symbol 레이어, HTML 마커 금지 — 성능):
   - z≥5: tier1, z≥6.5: tier2, z≥8: tier3 표시
   - 방문 도시는 --accent 점 + 도시명, 미방문은 --text-2 작은 점
   - 탭하면 시트에 도시 상세 (Phase 5 전까지는 이름만 표시하는 임시 시트)
7. 카메라: 첫 진입 시 유럽 전체 bounds, 회전·기울기 비활성, maxBounds로 유럽 밖 이동 제한
8. 홈 도시는 작은 집 아이콘(lucide House를 SVG 이미지로 등록), 렌즈 태그는 --accent
9. 성능: 도시 900개, 방문 200개 기준에서 모바일 60fps 근처. 안개 캔버스는 화면 안의 구멍만 그림.
   지도 인스턴스는 한 번만 생성
10. 테스트: 구멍 반경 계산(줌별 px 변환, 최소 반경), 렌즈 캐시 키, 라벨 충돌 판정, 방문 → 칠할 조각 계산 단위 테스트

완료 기준: 테스트 방문 데이터 10개를 넣은 상태로 유럽 전체, 국가 줌, 도시 줌 3단계 스크린샷을
라이트/다크로 찍어 확인. 이 환경에서 타일 서버가 막혀 있으면 지도 스크린샷 대신 그 사실을 PR에 적어줘.
```

**완료 체크** 유럽 전체에서 국기 퍼즐로 나라별 진행이 보이고, 확대하면 렌즈 → 실제 지도로 자연스럽게 넘어감

---

## Phase 4 — 원탭 체크인 & 도장 v2

**브랜치** `phase-4-checkin`
**목표** 필수 입력 0개로 도시를 "클리어"하는 핵심 동작과, 세련된 도장.

```text
Phase 4를 진행해줘. CLAUDE.md와 docs/DESIGN_REVIEW.md 3장(체크인 플로우), 4장(도장 v2)을 먼저 읽어.

1. 검색 (시트 peek의 검색창):
   - 탭하면 시트가 full로 열리고 입력에 포커스
   - 한글, 영어, 현지어 이름 모두 검색. 한글 초성 검색 지원 (es-hangul의 getChoseong). 예: "ㅍㄹㅎ" → 프라하
   - 결과 행: 원형 국기 + 도시명 + 국가명 · tier 점 + 방문했으면 체크 표시. 정렬은 일치도 → tier → 인구
   - 검색어가 비어 있을 때는 "📍 현재 위치로 찾기"와 홈 기준 가까운 미방문 도시 5개 추천
2. 현재 위치: navigator.geolocation → 30km 이내 가장 가까운 도시 제안. 권한 거부 시 조용히 숨김
3. 체크인:
   - 결과 행 탭 → 즉시 visit 저장(date=오늘) → 시트는 해당 도시 상세로 전환
   - 동시에 지도 flyTo + 안개 구멍 애니메이션 + 도장 "쾅" 오버레이(scale 1.6→1, 260ms, spring)
     + navigator.vibrate(12)
   - 하단 토스트 "프라하 도장 획득 · 되돌리기" (5초), 되돌리기 시 visit 삭제 + 안개 복원
   - 이미 방문한 도시도 같은 흐름으로 새 visit을 추가 (토스트 "프라하 3번째 방문", 도장은 기존 도장 위에 쌓이는 애니메이션)
   - 같은 도시를 같은 날 다시 찍으면 새 기록 대신 기존 기록의 도시 상세를 열고 "오늘 이미 기록했어요" 안내
4. 도장 v2 컴포넌트 <Stamp city visit size /> — docs/design/refs/03-stamps.jpg 와 concept.html의 stamp() 함수가 기준:
   - 순수 SVG. 모양 5종(원, 타원, 사각, 팔각, 육각)은 도시 id 해시로 고정, 각도 ±9°는 visit id 해시로 고정
   - 내부 레이아웃: 나라(영문 대문자, 작게, 자간 넓게) / 도시(현지 표기 대문자, 굵게) / 날짜 "13 OCT 2026" /
     구분선 / 위도 "50.0755° N" / 경도 "14.4378° E"
   - 서체: JetBrains Mono, 이중선(2.6 + 0.9), 색 --accent, 히든젬 도시만 --gold
   - 잉크 결: feTurbulence로 아주 미세한 점 빠짐만 (도시별 seed 고정). 번짐/왜곡 필터 금지
   - 미방문 상태용 점선 고스트 버전
   - 스냅샷 테스트로 모양 5종 고정
5. 도시 상세 (임시, Phase 5에서 확장): 큰 도장, 도시명(Display), 국가, 방문일,
   보조 버튼 3개(사진 추가 · 한 줄 남기기 · 날짜 변경)는 텍스트 버튼으로 조용히

완료 기준: Playwright e2e — "ㅍㄹㅎ" 검색 → 프라하 체크인 → 지도에 열림 → 되돌리기 → 원상복구.
체크인 순간 애니메이션 중간 프레임 스크린샷을 PR에 첨부.
```

**완료 체크** 검색부터 도장까지 탭 2번, 되돌리기 동작

---

## Phase 5 — 바텀시트 탐색 (나라 → 도시 → 기록)

**브랜치** `phase-5-collection`
**목표** 메뉴 없이 시트 하나로 컬렉션 전체를 탐색한다.

```text
Phase 5를 진행해줘. CLAUDE.md와 docs/DESIGN_REVIEW.md 3장을 먼저 읽어.

시트 안의 내비게이션 스택: 홈(peek/half) → 국가 상세 → 도시 상세. 뒤로가기는 시트 좌상단 화살표와
브라우저 뒤로가기(history API) 모두 동작. URL 쿼리(?country=CZ, ?city=cz-prague)로 딥링크 지원.

1. 시트 홈 (half 상태):
   - 상단 요약 "9개국 · 23개 도시 · 유럽의 4%"
   - 방문한 국기 가로 스크롤 줄 (peek에서도 보임)
   - 국가 리스트: 원형 국기, 국가명, "5 / 12 조각 · 7개 도시" + 얇은 진행 바(조각 기준).
     peek 상태의 국기 줄은 진행률 링(조각 기준, 완성 시 금색). 정렬: 방문한 나라(최근 방문 순) → 미방문(가나다)
   - 리스트 상단 세그먼트 1개만: [나라 | 도시] (필터 칩 여러 개 금지). 도시 탭은 방문한 도시를 최근 방문순으로,
     도장 썸네일 + 도시명 + 최근 날짜 + 2회 이상이면 "×3" 으로 보여줌
   - 디자인 기준: docs/design/refs/02-country-sheet.jpg (큰 제목 28px, 행 높이 64px, 원형 국기 34px)
2. 국가 상세: 그 나라의 국기 퍼즐 미니맵(칠한 조각/빈 조각, 탭하면 그 조각의 도시 목록) + 국가명 + 진행률,
   도시 그리드(도장 썸네일, 미방문은 고스트 도장).
   tier1 → 2 → 3 순으로 "대표 도시 / 더 많은 도시 / 히든젬" 섹션 구분. 지도는 국가 bounds로 fitBounds
3. 도시 상세 — 방문 히스토리 (concept.html 04번 화면이 기준):
   - 헤더: 도장 스택(방문 수만큼 겹쳐 쌓고 최신이 맨 위, 아래 것은 투명도를 낮춤), 도시명, 국가 · "3번 방문 · 총 6일",
     작은 칩 3개(첫 방문 연월 · 최근 연월 · 사진 수). 1회 방문이면 스택 대신 도장 1개 + 홈에서의 거리/이동 힌트
   - 방문 타임라인(최신순): 세로선 + 점, 각 항목 "N번째 · 2025.12.20 – 12.23 · 3박", 메모, 사진 썸네일 줄.
     첫 방문은 채워진 점 + FIRST, 최신은 LATEST 라벨
   - 항목을 탭하면 그 자리에서 펼쳐 편집: 날짜/종료일(머문 기간), 한 줄 메모(최대 140자), 사진(최대 10장,
     1600px JPEG로 압축해 Dexie에 Blob 저장). 사진은 탭하면 풀스크린 뷰어(같은 도시의 모든 방문 사진을 넘겨봄)
   - 하단 "다시 방문 기록" 버튼: 날짜 선택(기본 오늘, 과거 날짜 소급 가능) 후 추가
   - 방문 기록 삭제는 항목의 ... 메뉴 안에 (확인창). 마지막 방문을 지우면 도시가 미방문으로 돌아감을 안내
4. 사진 EXIF (exifr): 촬영일이 있으면 방문일 제안, GPS가 있으면 가장 가까운 도시를 제안
5. 지도와 시트 동기화: 시트에서 국가나 도시를 선택하면 지도가 이동하고, 지도에서 탭하면 시트가 열림

완료 기준: e2e — 지도에서 국가 탭 → 국가 상세 → 도시 체크인 → 사진 추가 → 다시 방문 기록(과거 날짜) →
타임라인에 2건이 날짜순으로 표시 → 뒤로가기 2번으로 홈. 모바일 스크린샷 4장(홈, 국가, 도시 1회, 도시 3회) 첨부.
```

---

## Phase 6 — 프로필 · 배지 · 백업

**브랜치** `phase-6-profile`

```text
Phase 6을 진행해줘. CLAUDE.md를 먼저 읽어.

우상단 프로필 버튼 → 전체 화면 페이지 하나 (탭 없음, 위에서 아래로 스크롤):

1. 헤더: 이름, 홈 도시(원형 국기), 편집 버튼
2. 숫자 3개만 크게: 도시(고유) · 나라 · 이동거리(km, 홈 기준 왕복 합, 방문마다 합산) — tabular-nums.
   그 아래 작은 줄: "총 31번의 방문 · 가장 많이 간 도시 프라하(3) · 파리(2) · 빈(2)"
3. 배지 (가로 스크롤 1줄, "모두 보기"로 그리드 시트):
   - src/features/profile/badges.ts — 데이터 기반 정의 (id, 이름, 설명, 목표, 계산 함수)
   - 25종 내외: 도시 수(1/10/25/50/100), 국가 수(5/10/20/30), 권역별, 독일 마스터(독일 tier1 전부),
     수도 컬렉터, 히든젬 헌터(tier3 10곳), 사계절, 한 달에 3개국, 북극권(위도 66.5° 이상),
     재방문 계열 — 또 왔어요(같은 도시 2번), 단골(같은 도시 5번), 사계절 단골(한 도시를 네 계절 모두),
     국기 퍼즐 계열 — 첫 국기 완성, 국기 3개/5개/10개 완성, 이웃 나라 국기 모두 완성 등
   - 아이콘은 lucide 아이콘 + 원형 배경. 미획득은 흑백
   - 새 배지 획득 시 체크인 토스트 다음에 배지 토스트 (중복 알림 방지 로직 + 테스트)
4. 타임라인: 모든 방문을 월별 그룹으로, 도장 썸네일 + 도시명(재방문이면 "· 3번째") + 메모 첫 줄 + 사진 1장
5. 설정 (페이지 맨 아래, 리스트 형태): 이름, 홈 도시, 테마(자동/라이트/다크),
   백업 내보내기(JSON + 사진 포함 zip, fflate 사용), 백업 가져오기(v0 JSON 호환), 모든 기록 삭제,
   앱 정보(버전, 오픈소스 라이선스, 데이터 출처)

완료 기준: 배지 계산 단위 테스트, 백업 → 전체 삭제 → 복원 왕복 테스트(사진 포함) 통과.
```

---

## Phase 7 — 공유 카드 & 연말 결산

**브랜치** `phase-7-share`

```text
Phase 7을 진행해줘. CLAUDE.md를 먼저 읽어.

1. 공유 카드 (프로필의 "공유" 버튼 1개 → 시트에서 형식 선택):
   - 피드 4:5 (1080x1350): 안개 지도 스냅샷(maplibre canvas, preserveDrawingBuffer) 위에
     숫자 3개, 최근 도장 6개, 이름과 날짜. 여백 많게, 장식 금지
   - 스토리 9:16 (1080x1920): 세로 레이아웃 버전
   - 국가 카드: 국가 상세에서 공유 → 해당 국가 국기 퍼즐(칠한 조각) + 도장 모음. 완성한 나라는 "완성" 표시
   - 도시 카드: 2번 이상 간 도시의 상세에서 공유 → "프라하와 나 · 3번의 방문" (쌓인 도장 + 방문 날짜들 + 사진 1장)
   - 생성은 OffscreenCanvas 또는 canvas. 폰트 로딩 완료(document.fonts.ready) 후 그리기
   - navigator.share(files) 지원 시 공유, 아니면 PNG 다운로드
2. 연말 결산 "My Euro Year" (12월 1일~1월 31일에만 프로필 상단에 배너로 노출):
   - 스와이프로 넘기는 5장: 올해 숫자 / 가장 먼 곳 / 최다 방문 국가 / 월별 막대 / 올해의 도장 컬렉션
   - 각 장 이미지 저장. 디버그용으로 ?wrap=2026 쿼리로 언제든 열 수 있게
3. 카드 렌더 함수는 순수 함수로 분리하고 스냅샷 테스트 (픽셀 비교 대신 draw call 기록 방식도 가능)

완료 기준: 카드 3종 이미지를 생성해 PR에 첨부.
```

---

## Phase 8 — PWA · 오프라인 · 품질

**브랜치** `phase-8-quality`

```text
Phase 8을 진행해줘. CLAUDE.md를 먼저 읽어.

1. PWA: vite-plugin-pwa (injectManifest). 아이콘 세트(192/512/maskable/apple-touch)는
   디자인 토큰 색으로 생성하는 스크립트 포함. 새 버전이 있으면 조용한 토스트 "업데이트 · 새로고침"
2. 오프라인: 앱 셸 precache. 지도 타일은 stale-while-revalidate, 최대 2000개 LRU.
   방문 도시 주변 z8~13 타일을 체크인 직후 백그라운드로 미리 받아두기(옵션, 와이파이일 때만)
3. 접근성: 지도 마커 키보드 탐색, 시트 포커스 트랩, 모든 아이콘 버튼 aria-label,
   대비 검사(axe-core를 Playwright에 연동)
4. 성능: 번들 분석(rollup-plugin-visualizer), maplibre는 동적 import, cities.json은 필요한 필드만,
   Lighthouse CI(모바일) 성능 90+, 접근성 95+, PWA 통과를 ci.yml에 추가
5. e2e 정리: 핵심 시나리오 5개(첫 진입, 체크인, 되돌리기, 사진 추가, 백업 복원)
   + 시각 회귀 스크린샷(모바일 라이트/다크)
6. 에러 처리: 저장소 접근 불가(시크릿 모드), 타일 로딩 실패, 용량 초과(navigator.storage.estimate)
   상황별 안내 화면

완료 기준: Lighthouse 리포트 수치와 e2e 결과를 PR 본문에 첨부.
```

---

## Phase 9 — (선택) 클라우드 동기화 & 공개 프로필

**브랜치** `phase-9-cloud`

```text
Phase 9를 진행해줘. CLAUDE.md를 먼저 읽어.

Supabase를 붙여 선택적 클라우드 동기화를 만든다. 로그인하지 않아도 지금처럼 로컬로 완전히 동작해야 한다.

1. 인증: Supabase Auth (Google, 이메일 매직 링크). 프로필의 설정에 "기기 간 동기화" 항목 1개
2. 스키마: profiles, visits, photos (Storage 버킷). RLS로 본인만 쓰기.
   supabase/migrations/에 SQL 마이그레이션 파일로 관리
3. 동기화: Dexie ↔ Supabase 양방향, updatedAt 기준 last-write-wins, 오프라인 큐.
   첫 로그인 시 로컬 기록 업로드
4. 공개 프로필: 설정에서 공개를 켜면 /?u=handle 링크로 지도, 도장, 배지를 읽기 전용으로 공개.
   메모와 사진은 각각 공개 여부 선택
5. 환경 변수: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (GitHub Actions secrets에서 주입).
   키가 없으면 동기화 UI를 숨김

완료 기준: 두 브라우저 컨텍스트에서 동기화 e2e 통과 (Supabase 로컬 CLI 또는 모킹).
필요한 Supabase 프로젝트 설정과 secrets 등록 방법을 docs/CLOUD_SETUP.md로 정리.
```
