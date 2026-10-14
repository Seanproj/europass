# 🛂 Euro Passport

독일에서 출발하는 **유럽 도시 도장깨기** 여행 기록장.
안개 덮인 유럽 지도에서, 방문한 도시 주변만 상세 지도가 열립니다.

> **현재 상태:** v1을 단계별로 개발 중이에요 (Phase 6 완료: 프로필 · 배지 · 백업). 예전 v0 앱은 `/v0/`에서 계속 쓸 수 있어요.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md) | v0 디자인 진단, v1 컨셉("안개 걷기"), 정보 구조, 디자인 시스템 |
| [docs/design/concept.html](docs/design/concept.html) | v1 시각 시안 (브라우저로 열기, 라이트/다크 전환 가능) |
| [docs/DEVELOPMENT_PROMPTS.md](docs/DEVELOPMENT_PROMPTS.md) | **Claude Code에 붙여 넣는 단계별 개발 프롬프트** (Phase 1~9) |
| [CLAUDE.md](CLAUDE.md) | Claude Code가 매 세션 자동으로 읽는 프로젝트 규칙 |
| [docs/PROPOSAL.md](docs/PROPOSAL.md) | 초기 기획 (플랫폼 비교) |

## 개발하는 법

```
/phase 1
```

Claude Code에서 위처럼 입력하면 해당 Phase를 브랜치 생성부터 PR까지 진행합니다.
PR을 확인하고 머지하면 GitHub Pages에 자동으로 배포됩니다. 다음 Phase는 새 세션에서 `/phase 2`로 이어가세요.

### 브랜치 전략

```
main  ←──  phase-1-foundation   (PR · 머지 시 자동 배포)
      ←──  phase-2-cities
      ←──  fix/…, feat/…        (Phase 밖의 작은 수정)
```

- `main`은 항상 배포 가능한 상태로 유지하고, 모든 작업은 브랜치에서 진행해 PR로 머지합니다
- PR마다 CI(`.github/workflows/ci.yml`)가 lint, typecheck, test, build를 돌립니다
- `main`에 머지되면 `.github/workflows/deploy.yml`이 Pages에 배포합니다

### 이미 갖춰진 환경

- `CLAUDE.md`: 스택, 디자인 규칙, 작업 흐름을 매 세션 자동으로 공유 → 같은 설명을 반복할 필요가 없어 토큰 절약
- `.claude/settings.json`: npm, git 같은 자주 쓰는 명령은 권한 확인 없이 실행
- `.claude/hooks/session-start.sh`: 클라우드 세션이 시작되면 `npm install`을 자동 실행
- `.claude/commands/phase.md`: `/phase N` 명령

## 로컬에서 실행

```bash
npm install
npm run dev        # 개발 서버 → http://localhost:5173
npm test           # 단위 테스트
npm run build      # 배포용 빌드 (dist/)
```

예전 v0 앱은 `legacy/v0/`에 있고, 배포 사이트의 `/v0/` 주소에서 계속 열 수 있어요.
v0에 남긴 기록은 v1을 처음 열 때 자동으로 옮겨집니다 (v0 데이터는 지우지 않음).

## 데이터와 라이선스

- 도시 이름·좌표·인구: [GeoNames](https://www.geonames.org/) (CC BY 4.0)
- 도시의 한글·영문·현지 이름: [Wikidata](https://www.wikidata.org/) (CC0)
- 나라 경계, 국기 퍼즐 조각: [Natural Earth](https://www.naturalearthdata.com/) (public domain), world-atlas / d3 / topojson-client (ISC)
- 국기 이미지: [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- 지도 타일: [OpenFreeMap](https://openfreemap.org/) · © OpenMapTiles · © OpenStreetMap 기여자 (ODbL), 렌더링: MapLibre GL JS (BSD-3-Clause)

앱 정보 화면용 목록은 `src/data/attributions.ts`에 있어요.

### 도시 데이터 다시 만들기

```bash
npm run data:cities    # GeoNames + Wikidata → src/data/cities.json, countries.json (+ 국기 퍼즐 조각)
npm run data:regions   # 국기 퍼즐 조각만 → src/data/regions.json, regions-flag.json
```

결과 JSON은 커밋되어 있어 앱 실행에는 네트워크가 필요 없어요. 원천 파일은 `data/.cache/`에 받아 두고 재사용합니다
(`npm run data:cities -- --refresh`로 다시 받기). 손으로 고칠 때는 `data/`의 파일을 수정하세요.

| 파일 | 용도 |
|---|---|
| `data/curated.csv` | 인구는 적어도 유명한 여행지 추가, 이름 덮어쓰기 |
| `data/tier1.txt` | 상징 도시(tier 1) 목록 |
| `data/ko-overrides.csv` | 한글(·영문) 이름 보충과 수정 |
| `data/excluded.csv` | 도시로 보기 어려운 지점 제외 (대도시의 구역 등) |
| `data/anchors-override.csv` | 국기 퍼즐 대표 도시 조정 |
