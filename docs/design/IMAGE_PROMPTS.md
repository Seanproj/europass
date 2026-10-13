# 레퍼런스 이미지 생성 프롬프트

다른 이미지 생성 AI(Midjourney, ChatGPT, Gemini 등)에서 **참고용 이미지**만 뽑기 위한 프롬프트입니다.
결과물은 `docs/design/refs/`에 저장하고, 개발할 때 Claude Code에 "이 이미지 느낌으로"라며 첨부하세요.

## 사용 팁

- 프롬프트는 영어가 결과가 좋습니다. 각 프롬프트 끝에 **공통 스타일**을 붙이세요.
- 이미지 AI는 한글을 거의 못 그립니다. 글자는 "no text" 또는 짧은 영문만 쓰게 했어요. 한글은 개발 단계에서 넣습니다.
- Midjourney라면 끝에 `--ar 9:19` (폰 화면), `--ar 1:1` (아이콘, 도장), `--ar 4:5` (공유 카드)를 붙이세요.
- 마음에 드는 결과가 나오면 같은 이미지를 기준으로 변형(Vary)을 3~4번 돌려 고르는 게 가장 효율적입니다.

## 공통 스타일 (모든 프롬프트 뒤에 붙이기)

```
minimal, calm, premium, warm off-white (#F6F5F1) and near-black (#15171A) palette with a single
vermilion red accent (#D8443A), lots of whitespace, soft single shadow, rounded corners,
clean sans-serif typography, Apple Maps and Airbnb level polish, Dribbble shot, high detail
```

**피할 것 (negative / "avoid"):**
```
no emoji, no gradients, no neon, no clutter, no skeuomorphic paper texture, no 3D, no stock photo,
no busy illustrations, no gibberish text
```

---

## 1. 지도 홈 화면 (가장 중요)

```
Mobile app UI screen, full-screen map of Europe as the hero. The map is a muted monochrome grey
"fog", and around a few visited cities (Paris, Frankfurt, Prague, Vienna, Rome) the fog clears in
soft circular holes revealing a detailed, colorful street map with streets, rivers and parks, like
fog of war in a game. Small circular country flag badges float over each country, unvisited ones
greyscale. Floating pill at top-left showing "23 · 9", circular profile button top-right.
Bottom sheet peeking from below with a rounded search field and a row of small round flags.
```

## 2. 안개가 걷히는 효과 클로즈업

```
Close-up of a minimalist map: a single circular area of a European old town revealed in crisp
detail (cream streets, light blue river, sage green parks, small red location dot), the
surrounding area dissolving into soft feathered pale grey fog. Top-down, flat vector cartography,
elegant, editorial.
```

## 3. 나라 목록 시트

```
Mobile app UI, bottom sheet pulled halfway over a muted map. Title "My Europe", segmented control
with two options, a clean list of countries: each row has a circular flag icon, country name,
a thin red progress bar and a counter like "6 / 42", a subtle chevron. iOS-quality list design,
generous row height, hairline dividers.
```

## 4. 도시 상세 / 도장 획득 순간

```
Mobile app UI, city detail bottom sheet. A large red passport stamp (line-art only: double circle
border, city name "PRAHA" curved along the top, date "13 OCT 2026", coordinates in tiny monospace)
slightly rotated, overlapping the top edge of the sheet. Big bold city name below, small flag and
date, a pill chip with a train icon and distance, three quiet icon buttons (photo, note, calendar).
A dark toast at the bottom with an "Undo" action. The zoomed map above shows the revealed old town.
```

## 5. 도장 디자인 세트

```
Set of 8 modern passport stamps on off-white background, grid layout, each a different shape
(circle, oval, rounded rectangle, octagon), single ink color vermilion red and one in muted gold,
line-art and typography only, monospace uppercase city names (PARIS, WIEN, PRAHA, ROMA, LISBOA,
AMSTERDAM, HALLSTATT, KOBENHAVN), dates and coordinates, slightly rotated, subtle ink imperfection,
minimal Swiss design, no illustrations inside.
```

## 6. 배지 아이콘 세트

```
Set of 12 achievement badge icons for a travel app, consistent thin line icons (Lucide style)
inside circles, earned badges in near-black circles with a thin gold ring, locked badges in light
grey; themes: footsteps, compass, backpack, train, mountain, sun, snowflake, castle, camera, pen,
airplane, crown. Flat, minimal, evenly spaced grid.
```

## 7. 인스타그램 공유 카드 (4:5)

```
Social media share card, portrait 4:5, for a travel collection app. Top two-thirds: a muted Europe
map with revealed colorful circles around visited cities. Bottom: three large numbers (cities,
countries, km) in bold sans-serif with small labels, a row of six small red passport stamps,
the user's name and year in small monospace. Editorial magazine layout, lots of whitespace.
```

## 8. 다크 모드

```
Same mobile app home screen in dark mode: near-black (#0F1012) background map, dark grey land,
revealed city areas show a dark detailed street map with deep blue river and dark green parks,
coral red accent (#F0625A), dark grey bottom sheet. Moody, elegant, high contrast but not harsh.
```

## 9. 앱 아이콘

```
App icon, rounded square, off-white background, a single minimal vermilion red passport stamp
circle with a tiny map pin or a small cleared circle revealing map lines inside, flat, centered,
no text, iOS app icon style.
```

---

## 레퍼런스를 정리해서 Claude Code에 넘기는 법

1. 고른 이미지를 `docs/design/refs/01-home.png`처럼 번호를 붙여 저장
2. Claude Code에 이미지를 첨부하고 이렇게 요청:

```
docs/design/refs/ 의 레퍼런스 이미지를 보고 docs/design/concept.html 시안을 업데이트해줘.
색과 간격은 DESIGN_REVIEW.md의 토큰을 유지하되, 레퍼런스에서 좋은 점
(예: 시트의 여백, 도장 디자인, 국기 크기)만 반영하고 무엇을 바꿨는지 알려줘.
```
