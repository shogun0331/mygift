# 공용 UI 프레임 팩 — 전달 (2026-10-30)

모든 파일 **글자·아이콘 베이크 없음** (타이틀/CTA/점 표시는 DOM·CSS).

## 1. 납품 파일

| 파일 | 해상도 | 비율 | 알파 | 용도 |
|---|---|---|---|---|
| `ui_dialog_frame.webp` | **900×1200** | 3:4 | ✓ | Rest/Unlock/TurnEvent/Rank/VIP/SNS결과/StaffRaise 공통 팝업 껍데기 |
| `ui_dialog_btn_primary.webp` | 800×200 | 4:1 | ✓ | 팝업 확인 CTA (슬레이트→바이올렛) |
| `ui_dialog_btn_primary_pressed.webp` | 800×200 | 4:1 | ✓ | 눌림 상태 |
| `dash_live_chat_frame.webp` | **720×1280** | 9:16 | ✓ | 대시보드 우측 LIVE CHAT / recentEvents 패널 래핑 |
| `ui_vn_dialogue_strip.webp` | **1200×240** | 5:1 | ✓ | 하단 대사 칩 (DonationThanks / PromotionCongrats / VipDepart) |
| `ui_phone_bezel.webp` | **720×1560** | 9:19.5 | ✓ | SNS 피드·리빌 공용 폰 프레임 |
| `ui_toast_frame.webp` | **640×200** | 16:5 | ✓ | 애정도·업적 코너 토스트 |

## 2. 홀(콘텐츠 영역) 좌표 — 픽셀 기준

| 파일 | hole x | hole y | inset (L/R/T/B) | 라운드 |
|---|---|---|---|---|
| `ui_dialog_frame` | 54–846 | 120–1104 | 6% / 6% / **10%** / 8% | 외 28 · 홀 14 |
| `dash_live_chat_frame` | 36–684 | 115–1216 | 5% / 5% / **9%** / 5% | 외 26 · 홀 12 |
| `ui_vn_dialogue_strip` | 14–1185 | 21–218 | 1.2% / 1.2% / 9% / 9% | 외 22 · 홀 8 |
| `ui_phone_bezel` | 21–698 | 54–1497 | 3% / 3% / 3.5% / 4% | 외 54 · 홀 40 |
| `ui_toast_frame` | 9–630 | 18–182 | 1.5% / 1.5% / 9% / 9% | 외 18 · 홀 8 |

- **아바타 자리**: `ui_vn_dialogue_strip` 좌측 10.5% 원형(지름 ≈ 126px), `ui_toast_frame` 좌측 13%(지름 ≈ 83px)
- **헤더 자리**: dialog 상단 0–120px(10%), live chat 상단 0–115px(9%)
- **폰 노치**: 가로 34–66%, 세로 1–3.4%에 다크 노치 컷

## 3. CSS 예시

```css
.ui-dialog {
  aspect-ratio: 3 / 4; max-width: 28rem;
  background-image: url('/assets/ui/ui_dialog_frame.webp');
  background-size: 100% 100%;
  position: relative;
}
.ui-dialog__header { position: absolute; left: 7%; right: 7%; top: 2%; height: 7.5%; }
.ui-dialog__body   { position: absolute; left: 6%; right: 6%; top: 10%; bottom: 8%; overflow-y: auto; }
.ui-dialog__cta    { position: absolute; left: 6%; right: 6%; bottom: 1.5%; aspect-ratio: 4/1; }

.ui-dialog__cta {
  background-image: url('/assets/ui/ui_dialog_btn_primary.webp');
  background-size: 100% 100%; border: 0;
}
.ui-dialog__cta:active { background-image: url('/assets/ui/ui_dialog_btn_primary_pressed.webp'); }

.chat-panel {
  aspect-ratio: 9 / 16;
  background-image: url('/assets/ui/dash_live_chat_frame.webp');
  background-size: 100% 100%;
}
.chat-panel__head  { position: absolute; left: 5%; right: 5%; top: 1.5%; height: 7%; }
.chat-panel__list  { position: absolute; left: 5%; right: 5%; top: 9%; bottom: 5%; overflow-y: auto; }

.vn-strip { aspect-ratio: 5/1; background-image: url('/assets/ui/ui_vn_dialogue_strip.webp'); background-size: 100% 100%; }
.vn-strip__avatar { position: absolute; left: 1.2%; top: 9%; width: 10.5%; aspect-ratio: 1; border-radius: 9999px; }
```

## 4. 테마 틴트 (이미지 재사용)

```css
.dialog--amber { filter: hue-rotate(28deg) saturate(1.1); box-shadow: 0 0 24px rgba(240,180,80,.22); }
.dialog--rose  { filter: hue-rotate(-18deg) saturate(1.15); box-shadow: 0 0 24px rgba(255,110,150,.22); }
.dialog--pink  { filter: hue-rotate(-40deg) saturate(1.2);  box-shadow: 0 0 24px rgba(255,60,160,.25); }
```

## 5. 그리지 않은 것 (CSS 유지 확정)

슈퍼챗/시스템 버블, 주간결산 풀시트, 프로모션 감사 풀스크린, 팬미팅 HUD, 게임클리어 텍스트, 튜토리얼 스포트라이트 — 전부 코드.

## 6. 제작 방식

전 7종 **코드 생성**. 이유: 3:4·4:1·9:16·5:1·9:19.5·16:5 중 엔진이 지원하는 비율이 3:4/9:16뿐이고, **홀 inset·아바타 자리·노치 컷·헤더 밴드를 픽셀 단위로 고정**해야 15개 팝업이 동일 규격으로 맞습니다.
