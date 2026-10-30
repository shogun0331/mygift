# 슬롯 화면 패널 재설계 — 신규 에셋 전달 (v4 · 2026-10-30)

대상: `public/casino/slot/`
이번 배치 = **신규 4개 파일** (패널 2종 + 스핀 버튼 2상태). 나머지는 기존 파일 재사용.

---

## 1. 신규 파일

| 파일명 | 해상도 | 알파 | 용도 |
|---|---|---|---|
| `slot_screen_panel.webp` | **1492 × 1080** | ✓ 실루엣 밖 투명 (3.1%) | **기본형** — 릴 창이 짙은 검정 유리. 심볼을 패널 **위**에 얹는 방식 |
| `slot_screen_panel_punch.webp` | 1492 × 1080 | ✓ 실루엣 밖 + **릴 창까지 투명** (56.6%) | **구멍형** — 심볼을 패널 **아래**에 두는 방식 |
| `slot_spin_btn.webp` | 512 × 512 | ✓ | 대형 스핀 버튼 **normal** (`SPIN` 영문 베이크) |
| `slot_spin_btn_pressed.webp` | 512 × 512 | ✓ | 대형 스핀 버튼 **pressed** (어둡게 + 상단 내부 그림자, 위치 동일) |

> 스핀 버튼은 **AI 생성이 아니라 코드 합성**(기존 금 링 베젤 + 코드 캡 + PIL 텍스트). 두 상태의 베젤·글자 위치가 픽셀 단위로 동일합니다.

---

## 2. 패널 안전대 좌표 (캔버스 1492×1080 기준)

| 요소 | left | top | width | height | 픽셀 |
|---|---|---|---|---|---|
| **LED 텍스트 박스** | 10.6% | 8.3% | 79.4% | 8.0% | x 158–1342, y 90–176 |
| **릴 창(심볼 영역)** | 9.5% | 21.3% | 81.5% | 67.2% | x 142–1358, y 230–956 |

- 릴 창 면적 ≈ **54.8%** (권장 55~65% 범위 근접)
- 릴 창은 **3열 × 3행**으로 나눠 쓰세요: 각 셀 = 창 폭/3 (≈405px), 창 높이/3 (≈242px)
- LED 띠는 스펙(상단 4~6%, 높이 10~12%)보다 **아래쪽·얕게** 나왔습니다(8.3% / 8.0%). 텍스트는 위 표의 박스 안에 넣으면 안전합니다

### CSS 예시
```css
.slot-screen-panel { position: relative; aspect-ratio: 1492 / 1080; }
.slot-screen-panel > img { width: 100%; height: 100%; display: block; }

.slot-led-text {            /* 상태 문구 */
  position: absolute; left: 10.6%; top: 8.3%; width: 79.4%; height: 8%;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums; letter-spacing: .06em;
}

.slot-reel-grid {           /* 심볼 3×3 */
  position: absolute; left: 9.5%; top: 21.3%; width: 81.5%; height: 67.2%;
  display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);
  gap: 0; overflow: hidden; border-radius: 3.5% / 5%;
}
.slot-reel-grid img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: screen; }
```

---

## 3. 두 패널 중 선택 기준

- **`slot_screen_panel.webp` (기본형, 권장)**: 심볼을 `z-index` 상위에 두고 `screen` 블렌드. 릴 창이 유리처럼 어둡게 남아 **깊이감**이 좋음
- **`slot_screen_panel_punch.webp` (구멍형)**: 심볼을 패널 아래 레이어에 두고 창을 통해 보이게. 심볼이 창 밖으로 새지 않게 `overflow: hidden` 필수. 회전 애니메이션(릴 스크롤)을 넣을 때 유리

---

## 4. 스핀 버튼 사용

```css
.slot-spin-btn { width: 5.5rem; height: 5.5rem; background: none; border: 0; padding: 0; }
.slot-spin-btn img { width: 100%; height: 100%; display: block; }
.slot-spin-btn:active img { content: url('/casino/slot/slot_spin_btn_pressed.webp'); }
```
- hover 강조는 기존 `btn_cap_glow.webp`를 버튼 뒤 `mix-blend-mode: screen`, `opacity: .45 → .85` + `scale(1.06)`
- 텍스트 없이 쓰고 싶으면(다국어) 이미지에서 SPIN을 지우고 코드 텍스트로 얹으면 됩니다

---

## 5. 이번 배치에서 버린 것 (UI에서 제거)

`slot_cabinet_classic` · `slot_cabinet_slim` · `slot_plinth` · `slot_spotlight` · `slot_lever` · `slot_toppanel` · `slot_reel_window` · 기기 내부 소형 캡/베젤
→ 파일은 남겨두되 레이아웃에서 사용하지 않음

## 6. 그대로 재사용

| 파일 | 비고 |
|---|---|
| `sym_*.webp` ×9 | 512×512 알파, `screen` 블렌드 |
| `slot_stage_bg.webp` | 1920×1074 RGB, cover |
| `slot_wintray.webp` | 2289×416 (5.5:1) 알파, LED 텍스트 오버레이 (`left 8% w 84% top 24% h 52%`) |
| `cctv_frame.webp` | 기존 유지 |
| `btn_cap_glow.webp` | 512 알파 방사형, 스핀 hover용 |

---

## 7. 조립 순서

```
header (title assets)
  └ stage_bg
      ├ CCTV (좌)
      └ slot_screen_panel (중앙)
            ├ LED 텍스트 (코드)
            └ 릴 그리드 3×3 (sym_*.webp, screen)
  └ bottom dock
        ├ SPINS LEFT n (코드)
        ├ slot_wintray + 금액 (코드)
        └ slot_spin_btn (+glow, pressed 스왑)
```
