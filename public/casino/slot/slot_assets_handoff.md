# 슬롯머신 아트 에셋 전달 문서 (v2 · 2026-10-30)

대상 경로: `public/casino/slot/`
포맷: WebP (알파 필요한 항목만 RGBA)

---

## 1. 신규 에셋 목록

| 파일명 | 해상도 | 알파 | 용도 / 조립 위치 |
|---|---|---|---|
| `slot_stage_bg.webp` | 1920×1074 | ✗ (RGB) | 슬롯 스테이지 **전체 배경**. `.slot-stage` 배경 레이어. `bg-slate-950` 대체 |
| `slot_wintray.webp` | 2289×416 (5.50:1) | ✓ RGBA (배경·여백 투명) | **TOTAL WIN 전용 바**. 기기 하단. 텍스트는 아래 §wintray 안전대 좌표 사용 |
| `slot_plinth.webp` | 1600×800 (2:1) | ✓ RGBA (알파 최대 231) | 캐비닛 발밑 **받침판 + 접촉 그림자 + 금 림**(코드 생성) |
| `slot_spotlight.webp` | 1056×1888 | ✓ RGBA (알파=휘도) | 기계 뒤·위 **스포트라이트 빔**. screen 또는 일반 블렌드 모두 가능 |
| `btn_cap_glow.webp` | 512×512 | ✗ (RGB, 검정=투명) | 스핀 캡 뒤 **골드/레드 글로우**. `mix-blend-mode: screen` |
| `sym_seven.webp` | 512×512 | ✓ 61.9% | 심볼 — 세븐 |
| `sym_diamond.webp` | 512×512 | ✓ 64.3% | 심볼 — 다이아몬드 |
| `sym_wild.webp` | 512×512 | ✓ 53.8% | 심볼 — 와일드(조커) |
| `sym_scatter.webp` | 512×512 | ✓ 68.3% | 심볼 — 스캐터(황금 티켓) |
| `sym_bell.webp` | 512×512 | ✓ 61.7% | 심볼 — 벨 |
| `sym_cherry.webp` | 512×512 | ✓ 65.3% | 심볼 — 체리 |
| `sym_lemon.webp` | 512×512 | ✓ 54.7% | 심볼 — 레몬 |
| `sym_grape.webp` | 512×512 | ✓ 60.3% | 심볼 — 포도 |
| `sym_star.webp` | 512×512 | ✓ 69.1% | 심볼 — 별 |

> 심볼 9종은 **동일 조명·동일 골든 톤**으로 재작업된 리프레시 세트입니다. 개체 기준 94%로 정사각 캔버스 중앙 배치했습니다.

---

## 2. 레이어 순서 (아래 → 위)

```
slot_stage_bg      (배경)
slot_spotlight     (screen)
slot_cabinet       (기존)
slot_plinth        (캐비닛 발밑 그림자)
slot_toppanel      (기존, 빈 LED)
slot_reel_window   (기존)
심볼 9종            (screen)
slot_wintray       (TOTAL WIN 바)
btn_bezel / btn_cap_normal·pressed   (기존)
btn_cap_glow       (screen, 캡 뒤)
```

---

## 3. 조립 시 지켜야 할 사항

1. **`slot_wintray`는 늘리지 말 것** — 이미 5.5:1로 크롭된 상태. `object-fit: contain` + 안쪽 padding으로 텍스트만 얹기 (toppanel 늘림 문제 재발 방지)
2. **`slot_plinth`** — `object-fit: contain` + 하단 정렬, 캐비닛 폭에 맞춰 가로만 확장. 세로를 늘리면 그림자가 두꺼워짐
3. **`slot_spotlight` / `btn_cap_glow`** — 반드시 `mix-blend-mode: screen`. 배경이 검정인 것이 정상이며 알파는 없음
4. **심볼** — `mix-blend-mode: screen` 전제로 제작됨(주변에 어두운 판 없음). 일반 블렌드로 쓰면 가장자리가 어색해질 수 있음
5. **`slot_stage_bg`** — 원본 1888폭을 1920으로 Lanczos 업스케일. 블러 배경으로 쓰면 뭉갬 없음
6. **문자·REC·타임스탬프·스캔라인·페이라인·hover glow는 전부 코드 처리** (이미지에 없음)

---

## 4. 코드 측 반영 체크리스트

- [ ] `slotConfig.ts`에 `stageBg` / `wintray` / `plinth` / `spotlight` / `btnCapGlow` 경로 추가
- [ ] `SLOT_ASSET_VER` 갱신 (심볼 9종 교체)
- [ ] `CasinoSlotMachine.tsx`: stage → spotlight → cabinet → plinth → wintray 순으로 레이어 스택
- [ ] TOTAL WIN: `slot_wintray` 프레임 + 코드 텍스트(비율 맞춤)
- [ ] 외곽 금테 제거 · 얇은 glow · 헤더 단일화 · Exit 축소
- [ ] CCTV/슬롯 상단 정렬, progress 패널 glass 처리
- [ ] spins 중복 제거(기계 쪽만), 마퀴 네온 깜빡임, 스핀 hover glow·scale
- [ ] TOTAL WIN 당첨 펀치 (기존 코인 FX 연결)

---

## 5. 제외/주의

- **`slot_lever`**: 위치 이슈로 이번 배치에서 제외 (사용하지 않음)
- **딜러 캐릭터**: 이번 배치 제외. 당분간 기존 HighLow 미디어 + CCTV 필터(코드)로 대체
- **`slot_plinth`는 AI 생성이 아니라 코드 생성** (AI는 캐비닛 다리·본체까지 그려서 실패)
- `btn_cap_normal` / `btn_cap_pressed`는 코드 생성본 사용 권장 (AI 캡은 금속 베젤이 계속 따라붙음)


---

## 6. slot_wintray 크롭 · 안전대 좌표 (v3)

- 캔버스: **2289 × 416 (5.50:1)**, 배경·여백 전부 투명
- 실제 바 아트: **2106 × 250**, 가로 8.0% / 세로 39.9% 투명 여백 확보 (안전대)
- **LED(텍스트) 영역 — 캔버스 기준 비율**
  - `left 4.2%` · `top 21.2%` · `width 91.6%` · `height 57.2%`
  - 실사용 권장 텍스트 박스(6% 인셋 적용): `left 8%` `width 84%` `top 24%` `height 52%`
- CSS 예시
  ```css
  .slot-device-wintray { position: relative; }
  .slot-device-wintray img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .slot-device-wintray .wintray-text {
    position: absolute; left: 8%; width: 84%; top: 24%; height: 52%;
    display: flex; align-items: center; justify-content: center;
    font-variant-numeric: tabular-nums;
  }
  ```
- **바를 절대 늘리지 말 것** — 비율이 5.5:1로 고정되어 있어 `object-fit: contain`이면 왜곡 없음

## 7. 버튼 강조: glow vs 캡 재출력

**권장: `btn_cap_glow.webp` 사용 (캡 재출력 불필요)**
- 이유: 버튼 아트를 그대로 두고 강조만 더하는 방식이라 상태(기본/눌림) 일관성이 깨지지 않음
- 사용법: 캡 뒤 레이어에 `mix-blend-mode: screen`, 기본 `opacity: .45~.55`, hover/당첨 시 `opacity: .85` + `transform: scale(1.06)`
- 캡을 물리적으로 키워야 하는 경우에만 재출력 (레이아웃상 버튼이 작아 보이는 문제는 CSS `transform: scale(1.1)`로 먼저 해결 권장)

## 8. stage_bg 적용 범위 (변경 없음)

- `slot_stage_bg.webp` **1920×1074 그대로 유지**
- 적용: 슬롯 스테이지 최상위 컨테이너 배경 1회 (`background-size: cover; background-position: center`)
- 중앙~우측은 기계 자리로 비어 있고, 좌측은 CCTV 패널이 올라갈 여백 — **좌측에 별도 그라데이션/오버레이 추가 금지**(이미 비네트 포함)
- 하단에 plinth가 오므로 배경 바닥 반사와 겹치지 않게 stage 높이를 기계 기준으로 맞출 것
