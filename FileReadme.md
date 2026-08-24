# Broadcast Game 프로젝트 구조 및 코드 배치 가이드 (`FileReadme.md`)

이 문서는 **Broadcast Game (`broadcast-game`)** 프로젝트의 전체적인 아키텍처, 파일 및 디렉토리 구조, 각 소스 코드 파일의 역할과 배치 상태를 설명합니다.

---

## 1. 프로젝트 형태 및 기술 스택

본 프로젝트는 **성인용 데스크톱 방송국 경영 시뮬레이션 게임**으로, Web 기술 기반으로 빌드되어 Electron 데스크톱 래퍼를 통해 실행됩니다.

| 구분 | 기술 스택 / 도구 | 비고 |
|------|-----------------|------|
| **플랫폼** | Electron 43 | Windows 데스크톱 앱 실행 환경 |
| **UI 라이브러리** | React 19 + TypeScript 6 | 반응형 컴포넌트 및 정적 타입 시스템 |
| **스타일링** | TailwindCSS 4 | 다크 미드나잇 스튜디오 테마 UI |
| **번들러/빌드** | Vite 8 | 빠른 HMR 지원 개발 서버 및 프로덕션 번들링 |
| **패키징** | Electron Builder | Standalone / Portable 실행 파일 빌드 |
| **데이터 저장** | IndexedDB (`idb`) + File Protocol | 브라우저 내장 DB 및 `media://` 프로토콜 기반 에셋 로딩 |

---

## 2. 전체 디렉토리 구조 (Folder Hierarchy)

```text
broadcast-game/
├── electron/                   # Electron 메인/프리로드 프로세스 코드
│   ├── main.cjs                # 메인 프로세스, Window 생성, Protocol/IPC 처리
│   └── preload.cjs             # Renderer ↔ Main 간 커스텀 API (ContextBridge)
│
├── public/                     # 정적 리소스 및 데이터 에셋 (빌드 시 그대로 포함)
│   ├── characters/             # 캐릭터 정보 (characters.json) 및 초상화 에셋
│   ├── chapter_assets/         # 챕터/이벤트별 컷씬 이미지, 동영상, loc JSON 데이터
│   └── loading_splash.bmp      # 로딩 스플래시 이미지
│
├── src/                        # React 렌더러 소스 코드
│   ├── App.tsx                 # 최상위 앱 라우팅 및 화면 상태 관리자
│   ├── main.tsx                # React 앱 엔트리 포인트
│   ├── index.css               # TailwindCSS 및 공통 게임 스타일 정의
│   ├── fonts.css               # 웹폰트 폰트 페이스 설정
│   │
│   ├── game/                   # 게임 코어 규칙 & 비즈니스 로직 모듈 (Pure JS/TS)
│   ├── events/                 # 이벤트/시나리오 시스템 & 저장소 및 에디터 엔진
│   ├── screens/                # UI 화면(Page), 탭 패널 및 대화형 모달 컴포넌트
│   │
│   ├── assets/                 # UI 공통 폰트 및 벡터 이미지 파일
│   ├── data/                   # SNS 대사 등 정적 텍스트 데이터
│   └── locales/                # 다국어 번역 팩 (KO, EN, JA, ES, DE, RU)
│
├── scripts/                    # 빌드/보조 유틸리티 스크립트 (create-splash.cjs 등)
├── docs/                       # 이벤트 스크립트 및 음성 사양 문서
├── dist/                       # Vite 프로덕션 빌드 결과물 (자동 생성)
├── package.json                # 의존성 및 실행 스크립트 정의
└── vite.config.ts              # Vite 및 Tailwind 번들러 환경 설정
```

---

## 3. 주요 소스 코드 상세 안내 (`src/`)

### 3.1. 엔트리 및 최상위 컴포넌트
- **[`src/main.tsx`](file:///f:/Broadcast/broadcast-game/src/main.tsx)**: React 19의 `createRoot`를 사용해 `#root` DOM에 애플리케이션을 마운트합니다.
- **[`src/App.tsx`](file:///f:/Broadcast/broadcast-game/src/App.tsx)**: 전체 게임의 메인 라우터 역할을 수행하며 메인 메뉴 (`MainMenu`), 인게임 (`InGame`), 방송 (`BroadcastScene`), 에디터 (`EditorScreen`) 간의 스크린 전환 및 글로벌 데이터(캐릭터, 로스터, 장비 등)를 상태로 관리합니다.

---

### 3.2. 게임 시스템 및 비즈니스 로직 (`src/game/`)

게임 내 모든 시뮬레이션 연산과 규칙은 UI와 분리되어 `src/game/` 폴더 내의 독립적인 모듈들로 작성되어 있습니다.

| 파일명 | 역할 및 주요 기능 |
|--------|------------------|
| **[`stationGradeConfig.ts`](file:///f:/Broadcast/broadcast-game/src/game/stationGradeConfig.ts)** | 방송국 등급(일반사업자 `black`, 영세기업 `tiny`, 중소기업 `sme` 등)의 게이트(순위 제한), 승급 심사 조건 규격 및 슬롯 해금 가격 설정 |
| **[`station.ts`](file:///f:/Broadcast/broadcast-game/src/game/station.ts)** | 방송국 등급 평가/심사 적용 (`applyStationReview`), 지연 초기화(Lazy Load) 및 등급 판정 로직 |
| **[`ranking.ts`](file:///f:/Broadcast/broadcast-game/src/game/ranking.ts)** | 리그/랭킹 순위 시스템, NPC 방송국 스폰, 월간 순위 변동 및 마일스톤 보상 연산 |
| **[`characters.ts`](file:///f:/Broadcast/broadcast-game/src/game/characters.ts)** | 크리에이터 캐릭터 스탯(인기, 스킬, 충성도, 피로도, 호감도) 및 등급(S/A/B/C) 시스템 |
| **[`scout.ts`](file:///f:/Broadcast/broadcast-game/src/game/scout.ts)** | 크리에이터 스카우트 확률, 영입 비용 계산 및 후보 생성 로직 |
| **[`staff.ts`](file:///f:/Broadcast/broadcast-game/src/game/staff.ts)** / **[`staffRoster.ts`](file:///f:/Broadcast/broadcast-game/src/game/staffRoster.ts)** | 방송국 스태프 영입, 직무 할당, 급여 계산 및 로스터 관리 |
| **[`broadcast.ts`](file:///f:/Broadcast/broadcast-game/src/game/broadcast.ts)** | 주간/일간 방송 실행, 시청자 수, 방송 수익 및 경험치 계산 연산 |
| **[`economy.ts`](file:///f:/Broadcast/broadcast-game/src/game/economy.ts)** / **[`tax.ts`](file:///f:/Broadcast/broadcast-game/src/game/tax.ts)** / **[`salary.ts`](file:///f:/Broadcast/broadcast-game/src/game/salary.ts)** | 월간 경영 정산 (수익, 지출, 스태프/크리에이터 급여, 세금 계산) |
| **[`studioSlots.ts`](file:///f:/Broadcast/broadcast-game/src/game/studioSlots.ts)** / **[`slotGear.ts`](file:///f:/Broadcast/broadcast-game/src/game/slotGear.ts)** / **[`slotManagers.ts`](file:///f:/Broadcast/broadcast-game/src/game/slotManagers.ts)** | 방송 스튜디오 슬롯 해금, 장비 설치/강화 및 전담 매니저 배치 시스템 |
| **[`sns.ts`](file:///f:/Broadcast/broadcast-game/src/game/sns.ts)** / **[`snsLines.ts`](file:///f:/Broadcast/broadcast-game/src/game/snsLines.ts)** | 크리에이터 SNS 피드 포스팅, 대사 데이터 로딩 및 도파민 반응 연산 |
| **[`vip.ts`](file:///f:/Broadcast/broadcast-game/src/game/vip.ts)** / **[`social.ts`](file:///f:/Broadcast/broadcast-game/src/game/social.ts)** | VIP 후원자 스폰, 스폰서십 제안 및 인맥/케어 로직 |
| **[`promotionExam.ts`](file:///f:/Broadcast/broadcast-game/src/game/promotionExam.ts)** / **[`condition.ts`](file:///f:/Broadcast/broadcast-game/src/game/condition.ts)** | 승급 시험 규칙 및 크리에이터 상태 관리 |

---

### 3.3. 이벤트 & 시나리오 엔진 (`src/events/`)

게임 내 비주얼 노벨 스타일의 컷씬, 데이트 이벤트, 렌더링 노드를 처리하는 모듈입니다.

| 파일명 | 역할 및 주요 기능 |
|--------|------------------|
| **[`db.ts`](file:///f:/Broadcast/broadcast-game/src/events/db.ts)** | IndexedDB 데이터베이스를 동기화하고, `public/chapter_assets/`의 챕터/이벤트 JSON 및 미디어를 로딩하는 영속성 계층 |
| **[`types.ts`](file:///f:/Broadcast/broadcast-game/src/events/types.ts)** | 이벤트 노드, 선택지, 미디어 맵, 컷씬 조건의 TypeScript 데이터 구조 정의 |
| **[`parseVnfExport.ts`](file:///f:/Broadcast/broadcast-game/src/events/parseVnfExport.ts)** | 컷씬 에디터/외부 스크립트를 시나리오 노드 데이터로 파싱 |
| **[`EventManagePanel.tsx`](file:///f:/Broadcast/broadcast-game/src/events/EventManagePanel.tsx)** | 개발자 모드 전용 이벤트 스크립트 및 에셋 관리 패널 |
| **[`EventSimulator.tsx`](file:///f:/Broadcast/broadcast-game/src/events/EventSimulator.tsx)** | 작성된 이벤트를 미리보기 플레이할 수 있는 시뮬레이터 |

---

### 3.4. UI 화면 및 컴포넌트 (`src/screens/`)

실제 사용자에게 보여지는 화면, 탭 패널 및 대화형 모달 창들입니다.

#### 메인 화면 계층 (Core Screens)
- **[`MainMenu.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/MainMenu.tsx)**: NEW GAME, LOAD, SETTINGS, EDIT(개발용 에디터 진입)를 선택하는 메인 타이틀 화면.
- **[`InGame.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/InGame.tsx)**: 메인 게임 셸. 하단 탭 네비게이션(DASHBOARD, CREATOR, SCHEDULE, STUDIO, RANKING) 및 월간/주간 턴 진행 모달들을 총괄 통제.
- **[`BroadcastScene.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/BroadcastScene.tsx)**: 방송 진행 시 전환되는 풀스크린 씬. 16:9 비디오 뷰어, 태블릿 UI, 채팅창 오버레이 및 배속 스킵 컨트롤 제공.
- **[`EditorScreen.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/EditorScreen.tsx)**: 개발자 전용 에디터 화면 (이벤트 노드 편집, 스태프 및 방송국 등급 설정 수정).

#### 대화상자 & 인터랙티브 모달 컴포넌트 (Modals)
- **[`StationReviewModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/StationReviewModal.tsx)**: 연간 방송국 승급 심사 결과를 연출하는 모달.
- **[`RankChangeModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/RankChangeModal.tsx)**: 월간 랭킹 변동 및 순위 상승을 알리는 모달.
- **[`DateEventModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/DateEventModal.tsx)** 크리에이터 데이트 컷씬 이벤트 팝업.
- **[`WeeklySettlementModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/WeeklySettlementModal.tsx)**: 주간 방송 결산 명세서.
- **[`SalaryNegotiateModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/SalaryNegotiateModal.tsx)** / **[`UnlockSlotModal.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/UnlockSlotModal.tsx)**: 연봉 협상 및 스튜디오 슬롯 해금 모달.
- **[`StationGradeEditorPanel.tsx`](file:///f:/Broadcast/broadcast-game/src/screens/StationGradeEditorPanel.tsx)**: 에디터 내 방송국 등급 승급 조건 및 슬롯 해금가를 편집하는 개발자 패널.

---

## 4. Electron 데스크톱 커스텀 레이어 (`electron/`)

Electron 프로세스는 웹 렌더러와 OS 파일 시스템 간의 통로 역할을 합니다.

- **[`electron/main.cjs`](file:///f:/Broadcast/broadcast-game/electron/main.cjs)**:
  - 데스크톱 앱 윈도우 생성 및 창 관리.
  - **`media://` 커스텀 스킴 핸들러**: `media://chapter_assets/...` 주소로 요청된 로컬 컷씬 동영상/이미지 파일들을 안전하게 디스크에서 읽어 반환합니다.
  - 개발 모드(`ELECTRON_DEV=1`)일 경우 `http://localhost:5173`을 로드하고, 프로덕션일 경우 `dist/index.html`을 로드합니다.
- **[`electron/preload.cjs`](file:///f:/Broadcast/broadcast-game/electron/preload.cjs)**:
  - `contextBridge`를 통해 Electron의 안전한 IPC 핸들러 및 파일 시스템 관련 커스텀 API를 렌더러의 `window.electron`에 노출합니다.

---

## 5. 실행 및 빌드 환경 파이프라인

`package.json`에 정의된 핵심 스크립트 동작 방식입니다:

1. **개발 모드 기동 (`npm run dev`)**:
   - `concurrently`를 통해 Vite 개발 서버(`http://localhost:5173`)와 Electron 프로세스를 동시에 띄웁니다.
   - HMR(Hot Module Replacement)이 활성화되며 개발자용 **[EDIT]** 에디터 버튼이 메인 메뉴에 노출됩니다.
2. **프로덕션 빌드 (`npm run build`)**:
   - `tsc -b`로 TypeScript 타입 검사를 거친 후 `vite build`를 실행하여 `dist/` 폴더에 최적화된 번들 결과물을 생성합니다.
3. **프로덕션 실행 (`npm start`)**:
   - 빌드된 `dist/index.html`을 기반으로 Electron 데스크톱 앱을 단독 구동합니다.



