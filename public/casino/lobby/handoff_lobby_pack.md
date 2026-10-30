# 카지노 로비 — 에셋 & 조립 핸드오프 (2026-10-30)

경로: `public/casino/lobby/` · **글자 베이크 없음** (타이틀/라벨/EXIT 텍스트는 DOM)

## 1. 납품 파일

| 파일 | 해상도 | 알파 | 내용 |
|---|---|---|---|
| `lobby_stage_bg.webp` | **1920×1080** | ✗ RGB | 다크 미드나잇 라운지. 중앙 통로 앰버 하이라이트, **좌/우 부스 존은 거의 검정**(포털 자리), 강한 비네트 |
| `lobby_portal_slot.webp` | **620×780** | ✓ (밖 투명) | 슬롯 입장 포털 — 금 아치 + 내부 슬롯머신 실루엣(3릴·크라운) + 핑크 네온 엣지 |
| `lobby_portal_highlow.webp` | **620×780** | ✓ (밖 투명) | 하이로우 포털 — 금 아치 + 매단 램프 + 펠트 타원 테이블 + 카드 2장 |
| `lobby_title_plate.webp` | **900×160** | ✓ | 상단 타이틀 크롬. 중앙 밴드 비움(어두운 리세스), 좌우 테이퍼 + 금 트림 |
| `lobby_exit_btn.webp` | **240×80** | ✓ | 나가기 버튼 크롬. 얇은 금 림, 글자 없음 |
| `lobby_portal_glow.webp` | **620×780** | ✓ (중앙 93) | 포털 호버 글로우(웜 앰버 세로 오벌) |

## 2. 조립 좌표 (1920×1080 기준)

| 요소 | 크기 | 위치 |
|---|---|---|
| **Stage BG** | 1920×1080 | full bleed, `background-size: cover; background-position: center` |
| **Title plate** | 691×123 (=36% 폭) | `top: 6%` · 가로 중앙 (`left: 32%`) |
| **Portal SLOT** | 620×780 | `left: 134px (7%)` · `top: 192px` (하단 여백 108px = 10%) |
| **Portal HIGH-LOW** | 620×780 | `left: 1166px` (= 1920−134−620) · `top: 192px` |
| **Portal 간격** | 412px (21.5%) | 620+620+412+134×2 = 1920 |
| **EXIT** | 120×48 (에셋 240×80을 절반 스케일) | `right: 115px (6%)` · `top: 54px (5%)` |

> 포털 하단 **라벨 존 = 각 포털의 하단 15%** (`y 663–780`). 그 안에 DOM으로 `SLOT` / `HIGH-LOW` + 한 줄 설명을 넣고, 이미지에는 장식이 없습니다.

## 3. CSS

```css
.lobby { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.lobby__bg {
  position: absolute; inset: 0;
  background: url('/casino/lobby/lobby_stage_bg.webp') center/cover no-repeat;
}

.lobby__title {
  position: absolute; left: 32%; top: 6%; width: 36%; aspect-ratio: 900/160;
  background: url('/casino/lobby/lobby_title_plate.webp') center/contain no-repeat;
}
.lobby__title-text {                 /* DOM */
  position: absolute; inset: 0; display: grid; place-items: center;
  letter-spacing: .18em; font-weight: 700;
}

.lobby__portal {
  position: absolute; top: 17.8%; width: 32.3%; aspect-ratio: 620/780;   /* 620/1920 */
  background-size: 100% 100%; border: 0; padding: 0; cursor: pointer;
  transition: transform .18s ease, filter .18s ease;
}
.lobby__portal--slot    { left: 7%;     background-image: url('/casino/lobby/lobby_portal_slot.webp'); }
.lobby__portal--highlow { right: 7%;    background-image: url('/casino/lobby/lobby_portal_highlow.webp'); }

.lobby__portal:hover {
  transform: scale(1.02);
  filter: brightness(1.12) drop-shadow(0 0 18px rgba(230,186,110,.55));
}
.lobby__portal:active { transform: scale(.995); filter: brightness(.94); }

.lobby__portal-glow {
  position: absolute; inset: 0; background: url('/casino/lobby/lobby_portal_glow.webp') center/100% 100% no-repeat;
  opacity: 0; transition: opacity .2s ease; pointer-events: none; mix-blend-mode: screen;
}
.lobby__portal:hover .lobby__portal-glow { opacity: .75; }

.lobby__label {                       /* 포털 하단 15% */
  position: absolute; left: 8%; right: 8%; bottom: 0; height: 15%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25rem;
  pointer-events: none;
}

.lobby__exit {
  position: absolute; right: 6%; top: 5%; width: 120px; height: 48px;
  background: url('/casino/lobby/lobby_exit_btn.webp') center/100% 100% no-repeat;
  border: 0; cursor: pointer;
}
.lobby__exit:active { filter: brightness(.8); }
```

## 4. 제작 메모

- **배경**: AI 생성 후 중앙 문 위 `EXIT` 네온 간판을 패치로 제거(문자 금지 스펙). 좌우 부스 어둠은 포털 대비용으로 의도된 상태
- **포털 2종**: AI 생성(3:4) → 테두리 연결 배경 제거 → 620×780 비율 크롭. 하단 15%는 장식 없는 어두운 패널로 남김
- **타이틀·EXIT·글로우**: 코드 생성(정확 비율·리세스 좌표)
- 파티클(`GoldenDustParticles`)은 기존 것 유지, 포털 pressed 전용 이미지는 불필요(CSS)
