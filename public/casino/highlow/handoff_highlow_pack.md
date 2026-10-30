# 하이로우 게임 UI 팩 — 전달 (2026-10-30)

대상: `public/casino/highlow/` (또는 기존 경로)

## 1. 납품 파일

| 파일 | 해상도 | 알파 | 비고 |
|---|---|---|---|
| `highlow_table_felt.webp` | **1920 × 1074 (16:9)** | ✗ RGB | 딥그린 펠트, 중앙 타원 하이라이트, 강한 비네트, 좌우 비움 |
| `highlow_card_back.webp` | **600 × 900 (2:3)** | ✓ | 다크네이비 + 얇은 금 테, 대각 격자 패턴, 중앙 메달리온(다이아 도형) |
| `highlow_card_front.webp` | **600 × 900 (2:3)** | ✓ | 크림/오프화이트 빈 면 + 얇은 금 테 + 실버 헤어라인. **마크·숫자·슈트 없음** |
| `highlow_bet_plinth.webp` | **1200 × 900 (4:3)** | ✓ | 다크 글래스 플레이트, 상단 하이라이트 (LOW/HIGH/TIE 뒤) |

- CCTV 베젤은 **신규 없음** → `public/casino/slot/slot_cctv_monitor_bezel.webp` 재사용
- 카드 라운드: **28px** (600×900 기준, 에셋에 포함됨 — CSS `border-radius` 불필요)

## 2. 카드 앞면 안전대 (600×900)

| 영역 | left | top | width | height | 픽셀 |
|---|---|---|---|---|---|
| 좌상단 랭크 | 0 | 0 | 12% | 16% | 0–72 / 0–144 |
| 우하단 랭크(180° 회전) | 88% | 84% | 12% | 16% | 528–600 / 756–900 |
| 중앙 슈트 | 30% | 30% | 40% | 40% | 180–420 / 270–630 |

- 테두리: 외곽 금 테 3px (inset 12px), 실버 헤어라인 1px (inset 21px)
- **모서리 10~12%는 완전히 깨끗** → 랭크 글자 얹기 안전

### CSS 예시
```css
.hl-card { position: relative; aspect-ratio: 2 / 3; }
.hl-card__face {
  position: absolute; inset: 0; width: 100%; height: 100%;
  background-size: 100% 100%;
}
.hl-card__face--back  { background-image: url('/casino/highlow/highlow_card_back.webp'); }
.hl-card__face--front { background-image: url('/casino/highlow/highlow_card_front.webp'); }

.hl-card__rank-tl { position: absolute; left: 6%; top: 4%; font-size: 11%; }
.hl-card__rank-br { position: absolute; right: 6%; bottom: 4%; transform: rotate(180deg); font-size: 11%; }
.hl-card__suit    { position: absolute; left: 30%; top: 30%; width: 40%; height: 40%; }
```

## 3. 펠트 배경

```css
.hl-table {
  background-image: url('/casino/highlow/highlow_table_felt.webp');
  background-size: cover; background-position: center;
}
```
- 중앙 타원 하이라이트에 카드가 놓이도록 스테이지 정렬
- 좌측 CCTV / 우측 패널 자리는 이미 어둡게 비어 있음 → 추가 그라데이션 불필요
- 형광 그린(`#0f0` 계열) CSS 배경은 제거

## 4. 코드에서 같이 손볼 것

1. 네온 글로우 제거 → **1px 보더 + soft drop-shadow**
2. LOW = 스틸블루 / HIGH = 웜 골드·오렌지(채도↓) / TIE = 실버·화이트 라인
3. `CardView`는 **이미지 배경 + 랭크·슈트만 DOM/SVG 오버레이** (CSS-only 카드 폐기)
4. 우측 STATS/INVENTORY → glass(반투명 + blur + hairline)
5. CCTV는 슬롯과 동일 베젤·inset, 스캔라인 약하게
6. 디버그 헤더 슬림화, 인게임 타이틀만 강조

## 5. 제작 방식 메모

- 펠트는 AI 생성(1888×1056) → 1920으로 Lanczos 업스케일
- **카드 앞/뒷면·베팅 플레이트는 코드 생성** — 이유: 2:3은 엔진 미지원 비율이고, "마크 금지·모서리 여백·앞뒤 크기 일치"를 픽셀 단위로 보장해야 함
- 풀덱 52장 없음: 앞면 1 + 뒷면 1로 전 카드 표현, 랭크·슈트는 코드 렌더
