# 🛂 Euro Passport

독일에서 출발하는 **유럽 도시 도장깨기** 여행 기록장.
안개 덮인 유럽 지도에서, 방문한 도시 주변만 상세 지도가 열립니다.

> **현재 상태:** v0(동작하는 MVP)가 배포되어 있고, v1 리디자인을 단계별로 개발하고 있습니다.

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

## 로컬에서 실행 (v0)

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

Phase 1 이후에는 `npm install && npm run dev`로 실행합니다.

## 데이터와 라이선스

- 지도 경계: Natural Earth (public domain), world-atlas / d3 / topojson-client (ISC)
- v1 예정: OpenFreeMap · OpenStreetMap 타일(ODbL), GeoNames(CC BY 4.0), Wikidata(CC0), flag-icons(MIT)
