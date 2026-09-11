# 📋 Broadcast Game 다국어 번역 및 한글 누출 종합 검수 보고서

> **검수 일시**: 2026-09-12
> **프로젝트 경로**: `F:\Broadcast\broadcast-game`

## 1. 종합 검수 요약

| 영역 | 검수 항목 | 발견 건수 | 상태 |
|---|---|---|---|
| **UI 번역 (src/locales)** | 한글 잔존 / 누락 / 빈 값 | 9건 | ⚠️ 보수 필요 |
| **이벤트 VN 대사** | 언어파일 누락 / 한글 잔존 / 미번역 / 화자명 | 0건 | ✅ 정상 |
| **채팅 & SNS 데이터** | 한글 잔존 / 누락 키 | 0건 | ✅ 정상 |
| **코드 내 대사 데이터** | 비한국어 필드 내 한글 잔존 | 0건 | ✅ 정상 |
| **인게임 소스코드** | 하드코딩된 한글 문자열 | 562줄 | ⚠️ i18n 적용 권장 |

## 2. UI 번역 리소스 검수 상세 (`src/locales/*.json`)

| 언어 | 총 키 수 | 한글 잔존(미번역) | 누락 키(Missing) | 빈 값(Empty) |
|---|---|---|---|---|
| **KO (기준)** | 1097 | - | - | - |
| **EN** | 1097 | 0건 | 0건 | 2건 |
| **JA** | 1099 | 0건 | 0건 | 0건 |
| **ZH-CN** | 1097 | 0건 | 0건 | 0건 |
| **ZH-TW** | 1097 | 0건 | 0건 | 0건 |
| **RU** | 1097 | 0건 | 0건 | 1건 |
| **ES** | 1097 | 0건 | 0건 | 3건 |
| **DE** | 1097 | 0건 | 0건 | 3건 |

## 3. 이벤트 / VN 대사 검수 상세 (`public/chapter_assets/events`)

## 4. 인게임 소스코드 내 하드코딩된 한글 (`src/**/*.tsx`, `.ts`)

> **참고**: 에디터/관리자 툴 전용 화면은 제외하고, 실제 플레이어에게 노출될 수 있는 인게임 UI 소스코드입니다.

### 📄 `src/game/ranking.ts` (129건)

| 라인 | 코드 스니펫 |
|---|---|
| 282 | `'갓생 라이브',` |
| 283 | `'네오 엔터',` |
| 284 | `'미드나잇 스튜디오',` |
| 285 | `'루멘 방송',` |
| 286 | `'하이퍼 채널',` |
| 287 | `'오로라 스트림',` |
| 288 | `'픽셀 하우스',` |
| 289 | `'노바 엔터테인',` |
| 290 | `'블루문 라이브',` |
| 291 | `'크림슨 스튜디오',` |
| 292 | `'스파크 TV',` |
| 293 | `'벨벳 방송국',` |
| 294 | `'카이로스 미디어',` |
| 295 | `'드림캐처 라이브',` |
| 296 | `'선셋 채널',` |
| ... | *외 114건 생략* |

### 📄 `src/minigames/highlow/HighLowMinigame.tsx` (64건)

| 라인 | 코드 스니펫 |
|---|---|
| 378 | `{/* Top Left [숫자 + 무늬] */}` |
| 388 | `{/* Center Center 대형 무늬 */}` |
| 395 | `{/* Bottom Right 180도 뒤집힌 [숫자 + 무늬] (우측 하단 정렬) */}` |
| 422 | `{/* 뒷면 카드: 스케일 다운 + 페이드 아웃 */}` |
| 427 | `{/* 앞면 카드: 스케일 핑퐁 바운스 + 페이드 인 */}` |
| 754 | `addLog(`💰 누적 당첨금 100% (+$${totalWinnings.toLocaleString()}) 수령 완료!`, 'win')` |
| 768 | `addLog(`=== [하이로우 카지노] 테이블에 입장하셨습니다 (기본 판돈: $${effectiveAnte.toLocaleString()}).` |
| 789 | `addLog(`🔥 누적 당첨금 $${currentBet.toLocaleString()} 전액 배팅! 라운드가 시작됩니다.`, 'info')` |
| 791 | `addLog(`무료 기본 판돈 $${currentBet.toLocaleString()} (자산 차감 없음). 라운드가 시작됩니다.`, 'info` |
| 798 | `addLog(`🎁 이번 라운드 드롭 보상 아이템 [${rewardItem.name}] 등장! (승리 시 수령)`, 'info')` |
| 834 | `addLog(`딜러가 카드 [${getCardDisplayValue(drawnDealer.value)} ${SUIT_SYMBOLS[drawnDe` |
| 857 | `addLog(`유저가 [${choice}] (배당률 ${payout}x) 를 선택했습니다.`, 'info')` |
| 883 | `addLog(`⚠️ 이미 이번 라운드에 [카드 엿보기] 센서가 가동 중입니다. (한 턴 중복 사용 불가)`, 'draw')` |
| 887 | `addLog(`⚠️ 이미 이번 라운드에 [배당 2배] 부스터가 적용 중입니다. (한 턴 중복 사용 불가)`, 'draw')` |
| 891 | `addLog(`⚠️ 이미 이번 라운드에 [패배 쉴드]가 발동 중입니다. (한 턴 중복 사용 불가)`, 'draw')` |
| ... | *외 49건 생략* |

### 📄 `src/screens/PromotionAuditModal.tsx` (46건)

| 라인 | 코드 스니펫 |
|---|---|
| 540 | `{/* 카드 선택 탭 키프레임 */}` |
| 562 | `{/* ⚔️ 최상위 Z-INDEX (z-[120]) 심사관 반격 4칸 대각선 비행 혜성 투사체 (카드 정중앙 정밀 타격) */}` |
| 571 | `{/* 붉은 뇌전 빛 줄기 에너지 트레일 (이모지 100% 제거, 순수 빔 빛 줄기전용) */}` |
| 573 | `{/* 붉은 혜성 빛 줄기 꼬리 트레일 */}` |
| 575 | `{/* 혜성 머리 빔 코어 발광 (이모지 없음) */}` |
| 581 | `{/* 카드 4칸 정중앙 타격 정밀 위치 계산 키프레임 */}` |
| 629 | `{/* 제출 카드 클릭 시 띄워지는 중간 사이즈 컷씬 미디어 오버레이 모달 (클릭 시 닫히며 심사관 타격 파티클 터짐) */}` |
| 647 | `{/* 상단 맘모스 헤더 */}` |
| 666 | `{/* 중단 메인 비주얼 영역 (심사관 & 퍼포먼스 미디어 뷰어) */}` |
| 668 | `{/* 심사관 프로필 / 스테이지 연출 */}` |
| 670 | `{/* 퍼포먼스 미디어 컷씬 영역 (1280x720 HD 16:9 정밀 해상도 핏 & 심사관 심쿵 쿵쾅 셰이크 적용) */}` |
| 678 | `{/* 심사관 메인 화면 헤더 오버레이 (선호 타입 & 🔥 심사관을 만족시켜라! 7개국어 뱃지) */}` |
| 694 | `{/* 💬 심사관 VN (Visual Novel) 스타일 하단 반투명 정중앙 대화창 코멘트 오버레이 */}` |
| 704 | `{/* VN 대화창 네임플레이트 중앙 헤더 */}` |
| 720 | `{/* VN 스타일 7개국어 정중앙 정렬 대화 본문 */}` |
| ... | *외 31건 생략* |

### 📄 `src/components/TutorialGuideOverlay.tsx` (41건)

| 라인 | 코드 스니펫 |
|---|---|
| 129 | `title: t('tutorial.step1Title') \|\| 'STEP 1: 크리에이터 영입',` |
| 130 | `desc: t('tutorial.step1Desc') \|\| '방송을 진행할 크리에이터를 영입하세요! 아래의 [영입] 버튼을 클릭하세요.',` |
| 131 | `targetLabel: '영입하기',` |
| 134 | `title: t('tutorial.step2Title') \|\| 'STEP 2: 스튜디오 슬롯 배치',` |
| 135 | `desc: t('tutorial.step2Desc') \|\| '영입한 크리에이터 카드를 클릭하거나 드래그하여 스튜디오 1번 슬롯에 배치하세요!` |
| 136 | `targetLabel: '스튜디오에 배치',` |
| 139 | `title: t('tutorial.step3Title') \|\| 'STEP 3: 대시보드로 이동',` |
| 140 | `desc: t('tutorial.step3Desc') \|\| '배치가 완료되었습니다. 하단의 [DASHBOARD] 탭을 눌러 방송 관제실로 이` |
| 141 | `targetLabel: '대시보드 이동',` |
| 144 | `title: t('tutorial.step4Title') \|\| 'STEP 4: 첫 방송 시작',` |
| 145 | `desc: t('tutorial.step4Desc') \|\| '모든 준비가 완료되었습니다! [방송 시작] 버튼을 눌러 첫 방송을 진행하세요!'` |
| 146 | `targetLabel: '방송 시작',` |
| 149 | `title: t('tutorial.step5Title') \|\| 'STEP 5: 월간 정산 명세서 확인',` |
| 150 | `desc: t('tutorial.step5Desc') \|\| '첫 방송이 끝났습니다! 수익과 순이익을 확인하고 [확인] 버튼을 눌러 정산을 완` |
| 151 | `targetLabel: '정산 확인',` |
| ... | *외 26건 생략* |

### 📄 `src/game/achievements.ts` (36건)

| 라인 | 코드 스니펫 |
|---|---|
| 186 | `name: '미야자와 리나',` |
| 188 | `ko: '미야자와 리나',` |
| 201 | `name: '타치바나 미사키',` |
| 203 | `ko: '타치바나 미사키',` |
| 216 | `name: '사토 메구미',` |
| 218 | `ko: '사토 메구미',` |
| 231 | `name: '아키야마 미호',` |
| 233 | `ko: '아키야마 미호',` |
| 246 | `name: '시라카와 아야',` |
| 248 | `ko: '시라카와 아야',` |
| 261 | `name: '센노 리나',` |
| 263 | `ko: '센노 리나',` |
| 276 | `name: '루이자',` |
| 278 | `ko: '루이자',` |
| 291 | `name: '사쿠라기 마이',` |
| ... | *외 21건 생략* |

### 📄 `src/game/stationGradeConfig.ts` (25건)

| 라인 | 코드 스니펫 |
|---|---|
| 170 | `black: '일반사업자',` |
| 171 | `tiny: '영세기업',` |
| 172 | `sme: '중소기업',` |
| 173 | `mid: '중견기업',` |
| 174 | `large: '대기업',` |
| 175 | `top: '일등기업',` |
| 423 | `ko: '사토 켄지',` |
| 433 | `ko: '전통과 기품, 격식을 엄격하게 심사하는 수석 심사관.',` |
| 445 | `ko: '타나카 렌',` |
| 455 | `ko: '압도적인 스킬과 화려한 무대 퍼포먼스를 중시하는 심사관.',` |
| 467 | `ko: '야마모토 류세이',` |
| 472 | `ru: 'Рюсэй Яма모토',` |
| 477 | `ko: '시청자와의 진정성 있는 소통과 공감을 최우선으로 보는 심사관.',` |
| 489 | `ko: '카와무라 다이치',` |
| 494 | `ru: 'Дайти Кава무ра',` |
| ... | *외 10건 생략* |

### 📄 `src/game/staffRoster.ts` (24건)

| 라인 | 코드 스니펫 |
|---|---|
| 44 | `namePack('tanaka-haruto', 'male', '田中 陽翔', '타나카 하루토', 'Haruto Tanaka', '田中 阳翔', ` |
| 45 | `namePack('inoue-ren', 'male', '井上 蓮', '이노우에 렌', 'Ren Inoue', '井上 莲', 'Рен Иноуэ'` |
| 46 | `namePack('kimura-sota', 'male', '木村 颯太', '키무라 소타', 'Sota Kimura', '木村 飒太', 'Сота` |
| 47 | `namePack('hayashi-kaito', 'male', '林 海斗', '하야시 카이토', 'Kaito Hayashi', '林 海斗', 'К` |
| 48 | `namePack('shimizu-yuto', 'male', '清水 悠人', '시미즈 유토', 'Yuto Shimizu', '清水 悠人', 'Ют` |
| 49 | `namePack('yamaguchi-hiroto', 'male', '山口 大翔', '야마구치 히로토', 'Hiroto Yamaguchi', '山` |
| 50 | `namePack('matsumoto-renya', 'male', '松本 蓮也', '마츠모토 렌야', 'Renya Matsumoto', '松本 莲` |
| 51 | `namePack('abe-kento', 'male', '阿部 健人', '아베 켄토', 'Kento Abe', '阿部 健人', 'Кенто Абэ` |
| 52 | `namePack('ishida-ryo', 'male', '石田 涼', '이시다 료', 'Ryo Ishida', '石田 凉', 'Рё Исида'` |
| 53 | `namePack('mori-daichi', 'male', '森 大地', '모리 다이치', 'Daichi Mori', '森 大地', 'Дайти ` |
| 54 | `namePack('ikeda-shota', 'male', '池田 翔太', '이케다 쇼타', 'Shota Ikeda', '池田 翔太', 'Сёта` |
| 55 | `namePack('fujita-makoto', 'male', '藤田 誠', '후지타 마코토', 'Makoto Fujita', '藤田 诚', 'М` |
| 56 | `namePack('takahashi-aya', 'female', '高橋 彩', '타카하시 아야', 'Aya Takahashi', '高桥 彩', ` |
| 57 | `namePack('suzuki-hana', 'female', '鈴木 花', '스즈키 하나', 'Hana Suzuki', '铃木 花', 'Хана` |
| 58 | `namePack('watanabe-rin', 'female', '渡辺 凛', '와타나베 린', 'Rin Watanabe', '渡边 凛', 'Ри` |
| ... | *외 9건 생략* |

### 📄 `src/screens/InGame.tsx` (21건)

| 라인 | 코드 스니펫 |
|---|---|
| 695 | `{/* UI 가독성을 위한 살짝 어두운 베일 */}` |
| 698 | `{/* 배경 이미지 위에 파티클 */}` |
| 3123 | `sexy: '섹시',` |
| 3124 | `elegance: '기품',` |
| 3125 | `communication: '소통',` |
| 3126 | `performance: '퍼포먼스',` |
| 3134 | `text: `🔥 주간 대세 트렌드가 [${trendNameMap[nextTrend]}] 타입으로 변경되었습니다! (+35% 수익 보너스)`,` |
| 3528 | `text: `🎰 ✨ [골든 베가스 카지노] 라운지가 오픈되었습니다! (하단 CASINO 탭)`,` |
| 5354 | `title="[DEV] 1달 전으로 이동"` |
| 5365 | `title="[DEV] 1달 후로 이동"` |
| 5435 | `{/* 탭 전환 시 언마운트하지 않아 idle 영상 루프 유지. 비활성 시 화면 밖으로 이동해 뒤에 비치지 않음 */}` |
| 5678 | `<option value="KO">한국어 (KO)</option>` |
| 5768 | `<span>{t('menu.achievements') \|\| '업적 (Achievements)'}</span>` |
| 5803 | `<span>{t('settings.exitToMenu') \|\| '나가기'}</span>` |
| 5847 | `? '신규 방송 슬롯 해금 가능!'` |
| ... | *외 6건 생략* |

### 📄 `src/screens/CharacterBulkSnsModal.tsx` (20건)

| 라인 | 코드 스니펫 |
|---|---|
| 18 | `2: '수위 2 · 어필',` |
| 19 | `3: '수위 3 · 화보',` |
| 90 | ``선택한 ${targetCount}명의 기존 SNS 게시물을 지우고 새 사진으로 교체합니다. 계속할까요?`,` |
| 119 | `일괄 SNS 등록` |
| 122 | `사진을 한 번 고르면 선택한 캐릭터 전원에게 같은 SNS 게시물이 등록됩니다. 캡션은 게임에서` |
| 123 | `캐릭터별로 랜덤 한마디가 붙습니다.` |
| 127 | `<p className="text-xs font-semibold text-slate-300">대상</p>` |
| 138 | `SNS 없는 캐릭터 ({emptyCount}명)` |
| 149 | `전체 ({characters.length}명)` |
| 155 | `<p className="text-xs font-semibold text-slate-300">등록 방식</p>` |
| 166 | `기존에 추가` |
| 177 | `기존 SNS 교체` |
| 183 | `<p className="text-xs font-semibold text-slate-300">수위</p>` |
| 203 | `<p className="text-xs font-semibold text-slate-300">사진</p>` |
| 247 | `{drafts.length > 0 ? `${drafts.length}장 선택됨 · 클릭해서 더 넣기` : '끌어다 놓거나 클릭'}` |
| ... | *외 5건 생략* |

### 📄 `src/App.tsx` (17건)

| 라인 | 코드 스니펫 |
|---|---|
| 283 | `throw new Error(res?.error \|\| '스태프 이미지를 저장하지 못했습니다.')` |
| 626 | `throw new Error(res.error \|\| '캐릭터 미디어를 폴더에 저장하지 못했습니다.')` |
| 1126 | `alert(err instanceof Error ? err.message : '스태프를 추가하는 도중 오류가 발생했습니다.')` |
| 1163 | `alert(err instanceof Error ? err.message : '스태프를 수정하는 도중 오류가 발생했습니다.')` |
| 1227 | `: '캐릭터를 추가하는 도중 오류가 발생했습니다.',` |
| 1350 | `: '캐릭터를 수정하는 도중 오류가 발생했습니다.',` |
| 1462 | `? '로컬 JSON 파일(events.json)'` |
| 1463 | `: '브라우저 DB(IndexedDB)'` |
| 1464 | `alert(`이벤트 데이터가 ${saveTarget}에 저장되었습니다.`)` |
| 1468 | `alert(`이벤트 데이터 저장 중 오류가 발생했습니다.\n${detail}`)` |
| 1481 | `? '로컬 JSON 파일(station_grade_config.json)'` |
| 1482 | `: '브라우저 저장소(localStorage)'` |
| 1483 | `alert(`방송국 등급 설정이 ${saveTarget}에 저장되고 즉시 적용되었습니다.`)` |
| 1486 | `alert('방송국 등급 설정 저장 중 오류가 발생했습니다.')` |
| 1497 | `alert('🔄 최신 station_grade_config.json 파일 및 밸런스 설정이 게임에 즉시 적용되었습니다!')` |
| ... | *외 2건 생략* |

### 📄 `src/minigames/highlow/highLowConfig.ts` (17건)

| 라인 | 코드 스니펫 |
|---|---|
| 19 | `name: '카드 엿보기',` |
| 21 | `description: '플레이어 카드 숫자를 미리 투시합니다.',` |
| 26 | `name: '배당 2배',` |
| 28 | `description: '승리 시 수령금을 2배로 증폭합니다.',` |
| 33 | `name: '패배 쉴드',` |
| 35 | `description: '패배해도 퇴장하지 않고 라운드를 이어갑니다.',` |
| 40 | `name: '스태프 영입',` |
| 42 | `description: '방송국 전용 스태프를 영입합니다.',` |
| 118 | `name: '로컬 룸 (Local Room)',` |
| 119 | `subtitle: '초보자를 위한 라이트 듀얼 테이블',` |
| 122 | `dealerName: '딜러 (Dealer)',` |
| 140 | `name: '스타 룸 (Star Room)',` |
| 141 | `subtitle: '하이 롤러를 위한 하이엔드 베팅 테이블',` |
| 144 | `dealerName: 'VIP 딜러 (VIP Dealer)',` |
| 162 | `name: '레전드 VIP 룸 (Legend VIP Room)',` |
| ... | *외 2건 생략* |

### 📄 `src/minigames/slot/slotConfig.ts` (17건)

| 라인 | 코드 스니펫 |
|---|---|
| 25 | `cherry: { id: 'cherry', name: '체리', icon: '🍒', multiplier: 2, weight: 28 },` |
| 26 | `lemon: { id: 'lemon', name: '레몬', icon: '🍋', multiplier: 3, weight: 24 },` |
| 27 | `grape: { id: 'grape', name: '포도', icon: '🍇', multiplier: 4, weight: 20 },` |
| 28 | `bell: { id: 'bell', name: '벨', icon: '🔔', multiplier: 5, weight: 16 },` |
| 29 | `star: { id: 'star', name: '별', icon: '⭐', multiplier: 8, weight: 12 },` |
| 30 | `diamond: { id: 'diamond', name: '다이아', icon: '💎', multiplier: 12, weight: 8 },` |
| 31 | `seven: { id: 'seven', name: '세븐', icon: '✨7️⃣✨', multiplier: 20, weight: 5 },` |
| 32 | `scatter: { id: 'scatter', name: '스캐터', icon: '🎰', multiplier: 10, weight: 4, isS` |
| 33 | `wild: { id: 'wild', name: '와일드', icon: '🃏', multiplier: 15, weight: 3, isWild: t` |
| 124 | `name: '중앙 가로줄',` |
| 134 | `name: '상단 가로줄',` |
| 144 | `name: '하단 가로줄',` |
| 154 | `name: '대각선 (좌상→우하)',` |
| 164 | `name: '대각선 (좌하→우상)',` |
| 174 | `name: '좌측 세로줄',` |
| ... | *외 2건 생략* |

### 📄 `src/events/commonEventLinks.ts` (14건)

| 라인 | 코드 스니펫 |
|---|---|
| 16 | `label: '새 게임 인트로',` |
| 17 | `hint: '새 게임 시작 시 재생되는 첫 이벤트',` |
| 21 | `label: 'VIP 등장 이벤트',` |
| 22 | `hint: 'VIP가 방송국을 찾아올 때',` |
| 26 | `label: '영세기업 승급심사',` |
| 27 | `hint: '101위 ~ 150위',` |
| 34 | `label: '중소기업 승급심사',` |
| 35 | `hint: '51위 ~ 100위',` |
| 42 | `label: '중견기업 승급심사',` |
| 43 | `hint: '21위 ~ 50위',` |
| 50 | `label: '대기업 승급심사',` |
| 51 | `hint: '11위 ~ 20위',` |
| 58 | `label: '일등기업 승급심사',` |
| 59 | `hint: '1위 ~ 10위',` |

### 📄 `src/game/auditEngine.ts` (10건)

| 라인 | 코드 스니펫 |
|---|---|
| 12 | `elegance: { label: '기품', icon: '💎', tone: 'text-purple-400 border-purple-500/40 ` |
| 13 | `performance: { label: '퍼포먼스', icon: '🎯', tone: 'text-cyan-400 border-cyan-500/40` |
| 14 | `communication: { label: '소통', icon: '💬', tone: 'text-emerald-400 border-emerald-` |
| 15 | `sexy: { label: '섹시', icon: '🔥', tone: 'text-rose-400 border-rose-500/40 bg-rose-` |
| 272 | `let message = `${CREATOR_TYPE_LABEL[cType].icon} ${creator.name} 퍼포먼스!`` |
| 274 | `message += ` 💥 CRITICAL! ${criticalMultiplier}배 대폭발!`` |
| 277 | `message += ` ✨ 타입 일치 1.5배 만족도 대폭 상승! (+${scoreGained}점)`` |
| 279 | `message += ` ⚠️ 타입은 맞지만 등급 미달로 점수 감점! (+${scoreGained}점, 심사관 반격 -${reboundDamage` |
| 281 | `message += ` 💬 일반 반응 (+${scoreGained}점)`` |
| 283 | `message += ` ⚡ 미달 및 불일치 감점 (+${scoreGained}점)`` |

### 📄 `src/game/bgm.ts` (10건)

| 라인 | 코드 스니펫 |
|---|---|
| 19 | `title: '메인화면 BGM',` |
| 20 | `desc: '타이틀·메인 메뉴에서 재생됩니다.',` |
| 23 | `title: '인게임 기본 BGM',` |
| 24 | `desc: '방송 준비·사무실 화면에서 재생됩니다.',` |
| 27 | `title: '방송중 BGM',` |
| 28 | `desc: 'ON AIR 방송 진행 중에 재생됩니다.',` |
| 31 | `title: '방송국 승급심사 BGM',` |
| 32 | `desc: '방송국 승급심사(서류 통과·덱 편성·공연 심사)에서 재생됩니다.',` |
| 35 | `title: '카지노 BGM',` |
| 36 | `desc: 'VIP 하이-로우 카지노에서 재생됩니다.',` |

### 📄 `src/events/parseVnfExport.ts` (9건)

| 라인 | 코드 스니펫 |
|---|---|
| 96 | `if (!entry) throw new Error(`필수 파일이 없습니다: ${path}`)` |
| 101 | `throw new Error(`JSON 파싱 실패: ${path}`)` |
| 291 | `throw new Error('project.json 을 찾을 수 없습니다. VNF Export ZIP 인지 확인하세요.')` |
| 305 | `throw new Error('project.json 에 chapters 가 없습니다.')` |
| 322 | `warnings.push(`챕터 ${chapterId}: start_node 가 없습니다.`)` |
| 341 | `warnings.push(`챕터 ${chapterId}: localization 파일을 찾지 못했습니다.`)` |
| 350 | ``챕터 ${chapterId}: 참조 미디어를 ZIP에서 못 찾음 — ${missing.slice(0, 5).join(', ')}${` |
| 351 | `missing.length > 5 ? ` 외 ${missing.length - 5}개` : ''` |
| 362 | `title: resolveTitle(titleKey, localization, defaultLanguage, `이벤트 ${chapterId}`)` |

### 📄 `src/events/types.ts` (7건)

| 라인 | 코드 스니펫 |
|---|---|
| 5 | `{ key: 'scout', label: '스카웃 이벤트' },` |
| 6 | `{ key: 'salary', label: '연봉 협상 이벤트' },` |
| 7 | `{ key: 'vip', label: 'VIP 이벤트' },` |
| 8 | `{ key: 'h', label: 'H 이벤트' },` |
| 9 | `{ key: 'date1', label: '데이트 1 이벤트' },` |
| 10 | `{ key: 'date2', label: '데이트 2 이벤트' },` |
| 11 | `{ key: 'endingVn', label: '엔딩 VN 이벤트' },` |

### 📄 `src/minigames/highlow/HighLowDealerSlot.tsx` (7건)

| 라인 | 코드 스니펫 |
|---|---|
| 108 | `{/* 숨겨진 파일 선택 Input */}` |
| 119 | `{/* 딜러 아바타 미디어 박스 */}` |
| 167 | `{/* 편집 가능 시 오버레이 가이드 */}` |
| 171 | `<span>클릭 또는 드롭</span>` |
| 172 | `<span className="text-[9px] text-pink-300 font-mono">이미지 / GIF / 동영상</span>` |
| 177 | `{/* 딜러 이름 & 타이틀 */}` |
| 187 | `{/* 딜러 대사/상태 박스 */}` |

### 📄 `src/screens/StationReviewModal.tsx` (7건)

| 라인 | 코드 스니펫 |
|---|---|
| 77 | `{/* 상단 포인트 조명 네온 바 */}` |
| 86 | `{/* 상단 뱃지 & 헤더 */}` |
| 113 | `{/* 타이틀 */}` |
| 130 | `{/* 등급 변환 (Transition UI) */}` |
| 156 | `{/* 심사 조건 항목 리스트 */}` |
| 207 | `{/* 승급 보상 정보 */}` |
| 231 | `{/* 미승급 시 안대 가이드 */}` |

### 📄 `src/game/staff.ts` (5건)

| 라인 | 코드 스니펫 |
|---|---|
| 61 | `security: '보',` |
| 62 | `repair: '수',` |
| 63 | `care: '케',` |
| 64 | `production: '프',` |
| 115 | `name: primaryCharacterLocaleText(names) \|\| String(raw.name ?? '').trim() \|\| ` |

### 📄 `src/screens/StaffSalaryRaiseModal.tsx` (5건)

| 라인 | 코드 스니펫 |
|---|---|
| 32 | `{/* 상단 포인트 조명 네온 바 */}` |
| 35 | `{/* 아바타 프로필 */}` |
| 50 | `{/* 뱃지 & 헤더 */}` |
| 60 | `{/* 대화 인용 & 연폭 정보 카드 */}` |
| 87 | `{/* 수락 / 거절 버튼 */}` |

### 📄 `src/minigames/slot/CasinoSlotMachine.tsx` (4건)

| 라인 | 코드 스니펫 |
|---|---|
| 272 | `dealerName: dealerConfig.dealerName \|\| '전설의 딜러',` |
| 390 | `dealerName: dealerConfig.dealerName \|\| '전설의 딜러',` |
| 458 | `{/* 럭셔리 보유 자산 표시 패널 */}` |
| 856 | `{/* FLOATING DEFEAT MODAL REMOVED — 기회 소진 시 패배 팝업 없이 딜러 패배 대사 & 음성만 재생 */}` |

### 📄 `src/screens/BroadcastScene.tsx` (4건)

| 라인 | 코드 스니펫 |
|---|---|
| 83 | `한` |
| 87 | `한소희 <span className="text-indigo-300">(A)</span>` |
| 133 | `한` |
| 135 | `<p className="text-lg font-semibold text-slate-100">한소희</p>` |

### 📄 `src/screens/PromotionNoticeModal.tsx` (4건)

| 라인 | 코드 스니펫 |
|---|---|
| 41 | `{/* 상단 화려한 광원 배너 */}` |
| 55 | `{/* 크리에이터 프로필 & 등급 전환 표시 */}` |
| 79 | `{/* 등급 전환 박스 */}` |
| 106 | `{/* 액션 버튼 */}` |

### 📄 `src/events/db.ts` (3건)

| 라인 | 코드 스니펫 |
|---|---|
| 401 | `return { success: false, error: '로컬 프로젝트 폴더에 저장할 수 없습니다.' }` |
| 525 | `return { success: false, error: '로컬 프로젝트 폴더에 저장할 수 없습니다.' }` |
| 551 | `return fromDev ?? { success: false, error: 'BGM 폴더를 열 수 없습니다.' }` |

### 📄 `src/minigames/highlow/HighLowDealerDialogue.tsx` (3건)

| 라인 | 코드 스니펫 |
|---|---|
| 44 | `dealerName && !dealerName.includes('룸') && !dealerName.includes('Room')` |
| 46 | `: '딜러'` |
| 180 | `(클릭하여 대사 닫기)` |

### 📄 `src/screens/RedDot.tsx` (3건)

| 라인 | 코드 스니펫 |
|---|---|
| 18 | `{/* 바깥으로 퍼져나가는 링 ×2 (교차) */}` |
| 21 | `{/* 하이라이트 스캔 (ping) */}` |
| 23 | `{/* 본체 */}` |

### 📄 `src/main.tsx` (2건)

| 라인 | 코드 스니펫 |
|---|---|
| 22 | `alert(`[전역 런타임 에러 감지]\n메시지: ${message}\n위치: ${source}:${lineno}:${colno}\n스택: ${` |
| 27 | `alert(`[비동기 프로미스 거부 감지]\n이유: ${event.reason}\n스택: ${event.reason?.stack}`)` |

### 📄 `src/screens/LoadGameModal.tsx` (2건)

| 라인 | 코드 스니펫 |
|---|---|
| 48 | `{saves.length} {t('save.savedCount') \|\| '개 저장됨'}` |
| 139 | `title={t('save.delete') \|\| '삭제'}` |

### 📄 `src/game/chatComments.ts` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 77 | `return `${creatorName}에게 ${money}를 후원 하였습니다.`` |

### 📄 `src/game/weeklyReport.ts` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 7 | `export const STATION_NAME = '스타라이트 방송국'` |

### 📄 `src/screens/EndingGalleryModal.tsx` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 102 | `그녀들과 함께한 특별한 결혼과 프러포즈 순간의 기록` |

### 📄 `src/screens/PromotionSlotModal.tsx` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 223 | `title="클릭하여 대사 음성 다시 듣기"` |

### 📄 `src/screens/ProposalShortsPlayer.tsx` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 135 | `{/* Decision Action Buttons ([💍 수락] / [❌ 거부]) */}` |

### 📄 `src/screens/SnsFeedModal.tsx` (1건)

| 라인 | 코드 스니펫 |
|---|---|
| 200 | `{/* SNS 달성 비율 게이지 바 */}` |

