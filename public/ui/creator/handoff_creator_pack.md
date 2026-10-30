# 크리에이터 아이콘 팩 — 전달 (2026-10-30)

루트: `public/ui/creator/`
모든 파일 **글자·숫자 베이크 없음**, 중앙 정렬, **가장자리 8% 여백**(256px 기준 20px, 28px로 줄여도 잘리지 않음).

| 파일 | 해상도 | 알파 | 내용 |
|---|---|---|---|
| `creator_grade_plate.webp` | 256×256 | ✓ (투명 52.5%) | **다크 메탈 육각 플레이트** — 뉴트럴 실버 림 + 중앙 어두운 홈(문자 올리는 자리) |
| `creator_type_sexy.webp` | 256×256 | ✓ 67.2% | 로즈 핑크 입술 + 작은 장미, 2색 플랫 |
| `creator_type_talk.webp` | 256×256 | ✓ 56.8% | 시안 마이크 + 말풍선 |
| `creator_type_mind.webp` | 256×256 | ✓ 60.0% | 바이올렛 머리 실루엣 + 스파크 |
| `creator_type_stage.webp` | 256×256 | ✓ 69.2% | 앰버 스포트라이트 + 마스크 |

## 등급 색 운용 (파일 1장으로 S/A/B/C)

```css
.creator-grade { width: 3rem; aspect-ratio: 1; background: url('/ui/creator/creator_grade_plate.webp') center/contain no-repeat; }
.creator-grade__text {                 /* 홈 중앙(지름 ≈ 60%)에 문자 */
  position: absolute; inset: 0; display: grid; place-items: center;
  font-weight: 800; font-size: 1.1rem; color: #f4e7c4;
  text-shadow: 0 0 8px rgba(0,0,0,.6);
}
.creator-grade[data-grade="S"] { filter: hue-rotate(38deg) saturate(1.5) drop-shadow(0 0 10px rgba(255,190,80,.65)); }
.creator-grade[data-grade="A"] { filter: hue-rotate(-12deg) saturate(1.3) drop-shadow(0 0 9px rgba(255,90,140,.55)); }
.creator-grade[data-grade="B"] { filter: drop-shadow(0 0 8px rgba(140,200,255,.5)); }
.creator-grade[data-grade="C"] { filter: saturate(.55) drop-shadow(0 0 7px rgba(170,170,180,.55)); }
```
- 림이 뉴트럴 실버라 hue-rotate로 **등급 색만** 바뀌고 금속 질감은 유지됩니다
- 홈(어두운 영역)은 지름 비율 **≈60%** → 문자 크기는 256 기준 90~120px 안쪽 권장

## 타입 아이콘

```css
.creator-type { width: 2.25rem; height: 2.25rem; object-fit: contain; }
```
- 플랫 2~3색, 입체 하이라이트 없음 → 배경색 어디에나 무리 없음
- 정사각 84% 채움·중앙 정렬이라 크롭 불필요

## 제작 메모

- `creator_grade_plate` = **코드 생성**(육각 기하 + 실버 그라데이션 + 내부 홈 + 상단 하이라이트). 등급별 색은 CSS 필터로 파생하므로 1장으로 충분
- 4종 타입 아이콘 = AI 생성(플랫 벡터 프롬프트) → **테두리 연결 배경 제거** 후 256 정사각 84% 배치
