# 덱(카드 배치) UI 에셋 — 전달 (2026-10-30)

루트: `public/ui/deck/` · **글자·숫자 베이크 없음**

| 파일 | 해상도 | 알파 | 내용 |
|---|---|---|---|
| `deck_modal_stage.webp` | **1920×1080** | ✗ RGB | 모달 뒤 무대. 어두운 스튜디오 바닥 + 중앙 원형 스포트 + 강한 비네트. `dash_stage_bg` 톤 맞춤(평균 휘도 19) |
| `deck_slot_empty.webp` | **600×800 (3:4)** | ✓ (모서리만 투명) | 빈 슬롯 플레이트. 다크 메탈 inset + 중앙 어두운 홈 |
| `deck_card_bezel.webp` | **600×800 (3:4)** | ✓ (투명 84.4%) | 배치 카드 위 **얇은 크롬 베젤** 오버레이. 홀 inset **4%** |

## 좌표

**deck_slot_empty (600×800)**
| 항목 | 값 |
|---|---|
| 외곽 라운드 | 24px |
| 홈(어두운 면) | `x 36–564` · `y 40–760` (inset 6% / 5%) · 라운드 16px |
| inset 그림자 | 홈 안쪽 상단 16px 블러 |

**deck_card_bezel (600×800)**
| 항목 | 값 |
|---|---|
| 홀 inset | **4%** → `x 24–576` · `y 32–768` · 라운드 18px |
| 베젤 폭 | 좌우 24px · 상하 32px (얇음) |
| 코너 액센트 | 34px L 브래킷 4곳 (얼굴 가리지 않음) |

## CSS

```css
.deck-stage {
  background-image: url('/ui/deck/deck_modal_stage.webp');
  background-size: cover; background-position: center bottom;
}

.deck-slot {
  position: relative; aspect-ratio: 3 / 4;
  background-image: url('/ui/deck/deck_slot_empty.webp');
  background-size: 100% 100%;
}
.deck-slot__label {          /* 번호는 DOM */
  position: absolute; left: 6%; right: 6%; top: 5%; bottom: 5%;
  display: grid; place-items: center; color: rgba(230,236,246,.5);
}

.deck-card-slot__placed {    /* 배치된 카드 이미지 */
  position: absolute; inset: 4%; border-radius: 18px; overflow: hidden;
}
.deck-card-slot__bezel {     /* 베젤 오버레이 (맨 위) */
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none;
}
/* 선택 상태는 CSS만 */
.deck-slot--selected .deck-card-slot__bezel {
  filter: drop-shadow(0 0 10px rgba(120,220,255,.85)) saturate(1.15);
}
.deck-slot--selected { transform: translateY(-6px) scale(1.03); }
```

## 제작 메모

- `deck_modal_stage` = AI 생성. **"카드"라는 단어를 프롬프트에서 제거**해야 바닥이 비었습니다(1차: 카드 4장, 2차: 카드 수십 장 생성됨 → 3차에 단어 제거 후 성공). 생성 후 `dash_stage_bg` 톤에 맞춰 0.52 감광 + 네이비 틴트 + 하단·비네트 추가 감광
- `deck_slot_empty`, `deck_card_bezel` = 코드 생성 (3:4 정확 비율 + 홈 inset·베젤 두께 고정)
- 카드 앞/뒷면은 하이로우 팩(`highlow_card_front/back.webp`) 재사용 가능 — 동일 2:3이나 이 슬롯은 3:4이므로 `object-fit: cover`로 크롭 배치 권장
