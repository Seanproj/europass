# 기기 간 동기화 설정 (Supabase)

기기 간 동기화와 공개 프로필(`/?u=handle`)은 **선택 기능**입니다.
아래 설정을 하지 않으면 앱은 지금처럼 이 기기 안에서만 동작하고, 설정 화면에 "기기 간 동기화" 항목이 보이지 않습니다.

필요한 것: Supabase 계정(무료 플랜으로 충분), Google Cloud 계정(Google 로그인을 쓸 때만), 이 저장소의 관리자 권한.

---

## 1. Supabase 프로젝트 만들기

1. <https://supabase.com/dashboard> → **New project**
2. 이름(예: `euro-passport`), 데이터베이스 비밀번호, 지역(**Central EU (Frankfurt)** 권장)을 정하고 만든다
3. 프로젝트가 준비되면 **Project Settings → API**(또는 **Data API**)에서 두 값을 메모한다
   - **Project URL** — `https://xxxxxxxx.supabase.co`
   - **anon public** 키 (또는 새 형식의 **publishable** 키)

> anon 키는 브라우저에 그대로 들어가는 공개 키입니다. 데이터는 RLS(행 수준 보안)로 지켜집니다.
> **service_role / secret 키는 절대 앱이나 GitHub 비밀값에 넣지 마세요.**

## 2. 데이터베이스 만들기 (마이그레이션 실행)

`supabase/migrations/20261014000000_cloud_sync.sql` 하나가 테이블, RLS, 함수, 사진 저장소(bucket)를 모두 만듭니다.

**방법 A — 대시보드 (가장 쉬움)**

1. 대시보드 왼쪽 **SQL Editor** → **New query**
2. 위 SQL 파일 내용을 전부 붙여 넣고 **Run**
3. **Table Editor**에 `profiles`, `visits`가, **Storage**에 `photos` bucket이 생겼는지 확인

**방법 B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref <프로젝트 ref>   # URL의 xxxxxxxx 부분
npx supabase db push
```

만들어지는 것:

| 이름 | 내용 |
|------|------|
| `profiles` | 이름, 홈 도시, 공개 주소(handle), 공개 여부, 메모/사진 공개 여부 |
| `visits` | 방문 기록 (메모, 사진 경로, 삭제 표시, 동기화 순번 `seq`) |
| `push_visits()` | 여러 기록을 한 번에 올리는 함수. `updated_at`이 더 최근인 쪽만 남긴다 (last-write-wins) |
| `public_profile()` | 공개로 켠 프로필만 읽기 전용으로 돌려준다. 메모·사진은 각각 켠 경우에만 포함 |
| Storage `photos` | 비공개 bucket. 본인 폴더(`<user id>/`)만 쓰고 읽을 수 있고, 공개 프로필 + "사진도 공개"일 때만 다른 사람이 읽을 수 있다 |

RLS 규칙: 로그인한 사람은 **자기 행만** 읽고 쓸 수 있습니다. 다른 사람의 데이터는 `public_profile()`을 통해서만, 공개로 켠 범위만 보입니다.

## 3. 로그인 방법 설정

대시보드 **Authentication → URL Configuration**

- **Site URL**: `https://seanproj.github.io/europass/`
- **Redirect URLs**에 추가:
  - `https://seanproj.github.io/europass/`
  - `http://localhost:5173/` (로컬 개발용)

앱은 로그인 후 지금 보고 있는 주소(`origin + pathname`)로 돌아오므로 위 주소가 정확히 등록되어 있어야 합니다.

### 이메일 로그인 링크 (기본으로 켜져 있음)

- **Authentication → Sign In / Providers → Email**이 켜져 있는지 확인
- 링크는 **요청한 그 브라우저에서** 열어야 로그인됩니다 (PKCE 방식).
  휴대폰 PWA에서 요청했다면 메일 앱의 링크가 다른 브라우저로 열릴 수 있으니, 그럴 때는 Google 로그인을 쓰거나 같은 브라우저에서 앱을 열어 다시 요청하세요
- Supabase 기본 메일 발송은 시간당 몇 통으로 제한됩니다. 여러 사람이 쓸 계획이면 **Authentication → Emails → SMTP Settings**에서 자체 SMTP를 연결하세요

### Google 로그인 (선택)

1. <https://console.cloud.google.com/> → 프로젝트 선택(또는 새로 만들기)
2. **APIs & Services → OAuth consent screen**: 외부(External), 앱 이름 `Euro Passport`, 지원 이메일 입력
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - 유형: **Web application**
   - **Authorized JavaScript origins**: `https://seanproj.github.io`
   - **Authorized redirect URIs**: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`
     (Supabase의 Google provider 화면에 정확한 주소가 표시됩니다)
4. 만들어진 **Client ID**와 **Client secret**을 Supabase **Authentication → Sign In / Providers → Google**에 넣고 켠다

## 4. GitHub에 비밀값 등록

저장소 **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | 1단계의 Project URL |
| `VITE_SUPABASE_ANON_KEY` | 1단계의 anon(publishable) 키 |

`.github/workflows/deploy.yml`의 빌드 단계가 이 값을 넣어 빌드합니다. 등록한 뒤에는
**Actions → Deploy to GitHub Pages → Run workflow**로 한 번 다시 배포하면 설정 화면에 "기기 간 동기화"가 나타납니다.
(비밀값이 없으면 동기화 UI가 숨겨진 채로 빌드되므로, 등록 전에 머지해도 문제없습니다.)

## 5. 확인하기

1. 휴대폰과 PC에서 사이트를 열고 프로필 → 설정 → **기기 간 동기화**
2. 같은 계정으로 로그인 → 상태가 "켜짐 · 마지막 동기화 방금"이 되는지
3. 한쪽에서 체크인 → 다른 쪽에서 "지금 동기화" 또는 앱을 다시 열면 도장이 나타나는지
4. 공개 주소(handle)를 저장하고 **공개**를 켠 뒤, 로그인하지 않은 브라우저(시크릿 창)에서 `https://seanproj.github.io/europass/?u=<handle>`

Supabase 대시보드 **Table Editor → visits**에서 실제로 올라간 행도 볼 수 있습니다.

## 로컬 개발

저장소 루트에 `.env.local`(커밋하지 않음)을 만든다:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

`npm run dev` 후 <http://localhost:5173/>에서 확인합니다 (3단계의 Redirect URLs에 이 주소가 있어야 함).

실제 Supabase 없이 동기화를 시험할 때는 모의 서버를 씁니다. e2e(`cloud` 프로젝트)가 쓰는 것과 같은 방식입니다:

```bash
npx tsx scripts/mock-cloud.ts 5199                     # 모의 클라우드 서버
VITE_CLOUD_MOCK_URL=http://localhost:5199 npm run dev  # 이메일만 넣으면 바로 로그인됨
npx playwright test --project=cloud                    # 두 브라우저 컨텍스트 동기화 e2e
```

## 동작 방식 요약

- 로그인하지 않아도 모든 기능은 이 기기 안에서 그대로 동작합니다. 동기화는 추가 기능입니다
- **첫 로그인** 때 이 기기의 기록을 모두 올리고, 계정에 있던 기록을 받아 합칩니다 (지우지 않음)
- 같은 기록을 두 기기에서 고치면 **나중에 고친 쪽**(`updatedAt`)이 남습니다
- 오프라인에서 한 변경은 기기에 남아 있다가, 다시 연결되거나 앱을 열면 올라갑니다
- 삭제는 "지웠다는 표시"로 전파되어 다른 기기에서도 지워집니다
- 사진은 내용 해시로 저장해서 같은 사진을 두 번 올리지 않습니다
- 로그아웃해도 이 기기의 기록은 지워지지 않습니다. 다른 계정으로 로그인하면 이 기기 기록을 그 계정에 새로 올립니다
- "모든 기록 삭제"는 로그인 중이면 다른 기기와 클라우드에서도 지워집니다 (확인 창에 안내)
