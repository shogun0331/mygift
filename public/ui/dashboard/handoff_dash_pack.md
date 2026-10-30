# 방송 대시보드 UI 팩 — 전달 (2026-10-30)

## 1. 납품 파일

| 파일 | 해상도 | 비율 | 알파 | 용도 |
|---|---|---|---|---|
| `dash_stage_bg.webp` | **1920×1080** | 16:9 | ✗ RGB | `.game-stage` 풀블리드 배경 (관제실, 중앙 스포트라이트, 비네트, 옅은 테크 그리드) |
| `dash_stream_bezel.webp` | **1200×600** | 2:1 | ✓ | 스트림 카드 공용 CCTV 베젤 (1장 재사용) |
| `dash_btn_start_live.webp` | **800×200** | 4:1 | ✓ | START LIVE CTA (핑크→마젠타), 글자 없음 |
| `dash_btn_start_live_pressed.webp` | 800×200 | 4:1 | ✓ | 눌림 상태 (어둡게 + 내부 그림자) |
| `dash_hud_quest_frame.webp` | **1000×200** | 5:1 | ✓ | 상단 퀘스트 바 크롬 (좌측 아이콘 존 + 빈 트랙) |
| `dash_btn_promo_audit.webp` | 800×200 | 4:1 | ✓ | PROMOTION AUDIT CTA (웜 골드/앰버) |
| `dash_rank_crown.webp` | **256×256** | 1:1 | ✓ (51.3%) | 1위 왕관 배지 |

## 2. 좌표 / 안전대

**stream_bezel (1200×600)**
| 항목 | 값 |
|---|---|
| 홀 inset | L **5%** · R **5%** · T **5%** · B **7%** |
| 홀 픽셀 | x 60–1140 (1080px) · y 30–558 (528px) |
| 홀 라운드 | 16px |
| 외곽 라운드 | 26px |
| 코너 스크류 | 26px 위치, 지름 16px |

**quest_frame (1000×200)**
| 항목 | 값 |
|---|---|
| 아이콘 존 | x 16–180 (18%) · y 16–183 |
| 진행 트랙 | x 220–965 · y 76–124 (h 48px) |
| 외곽 라운드 | 22px |

**button (800×200)** — 라운드 34px, 상단 하이라이트 밴드 12–42% 높이

**stage_bg** — 하단 45%부터 최대 −42% 밝기 감쇠, 좌우 12% 가장자리 −20% (스트림 그리드 대비 확보)

## 3. CSS 예시

```css
.game-stage {
  background-image: url('/assets/dash/dash_stage_bg.webp');
  background-size: cover; background-position: center;
}

.stream-card { position: relative; aspect-ratio: 2 / 1; }
.stream-card__feed {                 /* 피드 영상 */
  position: absolute; left: 5%; right: 5%; top: 5%; bottom: 7%;
  overflow: hidden; border-radius: 16px;
}
.stream-card__bezel {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none;
}
/* 상태 글로우는 CSS로 */
.stream-card--live  { box-shadow: 0 0 0 1px rgba(255,70,90,.35), 0 0 22px rgba(255,40,70,.28); }
.stream-card--ready { box-shadow: 0 0 0 1px rgba(70,230,140,.30), 0 0 18px rgba(40,220,120,.22); }

.game-btn-live {
  width: 100%; aspect-ratio: 4 / 1; background: none; border: 0; padding: 0;
  background-image: url('/assets/dash/dash_btn_start_live.webp');
  background-size: 100% 100%;
}
.game-btn-live:active {
  background-image: url('/assets/dash/dash_btn_start_live_pressed.webp');
}
.quest-frame {
  aspect-ratio: 5 / 1;
  background-image: url('/assets/dash/dash_hud_quest_frame.webp');
  background-size: 100% 100%;
}
.quest-frame__icon  { position: absolute; left: 1.6%; top: 8%; width: 16.4%; height: 84%; }
.quest-frame__track { position: absolute; left: 22%; top: 38%; width: 74.5%; height: 24%; }
```

- 버튼 텍스트(`START LIVE`, `방송 시작`, `PROMOTION AUDIT`)는 **HTML/DOM**으로 얹기 (i18n 대응)
- 진행 바 필(fill)은 트랙 안에 `border-radius: 10px` 그라데이션으로 CSS 처리
- 스트림 카드 6장 = 베젤 1장 재사용, LIVE/READY 네온은 `box-shadow`만 교체

## 4. 그리지 않은 것 (CSS 처리 확정)

스태미나/컨디션 바, 패널 glass, LIVE/READY 네온, 이미지→정보창 그라데이션, dock 아이콘·선택 네온, LIVE CHAT 점멸, 숫자 위계·폰트, 스캔라인/노이즈/reticule — 모두 기존 `.cctv-*` 또는 CSS로.

## 5. 제작 방식

- `dash_stage_bg`, `dash_rank_crown` = **AI 생성** (후처리: 배경 하단 감광 / 왕관 알파 컷아웃)
- `dash_stream_bezel`, 버튼 3종, `dash_hud_quest_frame` = **코드 생성** (2:1·4:1·5:1은 엔진 미지원 비율 + 구멍 inset·트랙 좌표를 픽셀 단위로 고정해야 함)
