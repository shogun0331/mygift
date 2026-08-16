# 이벤트 — 음성 JSON 구조

이벤트 JSON에는 별도 `voice.json` 파일이 없습니다. **대사 음성은 텍스트 노드 안의 필드**이고, 실제 오디오 파일은 그 이벤트의 `media` 목록 + `sounds/` 폴더에 있습니다.

이 문서는 시뮬레이터가 실제로 읽는 형태입니다.

---

## 어디에 붙는가

```
chapter_assets/
  events.json                      ← 이벤트 목록(메타만)
  events/
    {eventId}.json                 ← 노드·media·voice 파일명 (localization 없음)
    {eventId}/
      sounds/{파일명}              ← 일본어 보이스 등
      loc/ko.json
      loc/en.json
      loc/ja.json
      loc/zh-cn.json
      loc/ru.json
      loc/es.json
      loc/de.json
```

자막은 UI와 같은 7개국입니다. 디스크 키는 소문자(`zh-cn`). 각 `loc/{lang}.json`은 `{ "text_key": "대사" }` 만 담습니다.

`{eventId}.json` 의 `nodes[]` 중 `type` 이 `"text"` 인 줄이 대사이고, 여기에 음성을 겁니다.

JSON은 평문입니다. 아래 예는 디스크에 저장되는 객체 모양입니다.

---

## 텍스트 노드 — 음성 필드

에디터가 새로 만드는 텍스트 노드:

```json
{
  "id": "node_1710000000_ab12",
  "type": "text",
  "speakerType": "character",
  "speaker": "sea",
  "text": "안녕.",
  "voice": "sea_01.mp3",
  "stopVoice": true,
  "stopBgm": false
}
```

| 필드 | 타입 | 기본 | 의미 |
|------|------|------|------|
| `voice` | `string` (`""` 가능) | `""` | 이 줄의 **일본어 보이스 파일명 하나** |
| `stopVoice` | `boolean` | `true` (생략 시 true) | 이 줄에 들어오면 **기존 보이스 채널을 먼저 끈다** |
| `stopBgm` | `boolean` | `false` | `true` 이면 이 줄에서 **배경음 채널을 끈다** |
| `sound` | `string` (레거시) | 없음 | `voice` 가 비어 있을 때만 보이스로 쓴다. 사운드 노드와 다름 |

`voice` 가 빈 문자열이면 이 줄은 대사만 있고 새 보이스는 안 켭니다. `stopVoice` 가 true(기본)면 이전 줄 보이스는 끊깁니다.

---

## `voice` 는 언어별로 나누지 않는다

보이스는 **항상 일본어 트랙 하나**입니다. UI 언어(한/영/일)가 바뀌어도 같은 파일을 재생합니다.

```json
"voice": "sea_hello.mp3"
```

- `media` 의 `fileName` 과 **완전히 같은 문자열**이어야 합니다. 경로를 넣지 않습니다.
- `loc/{lang}.json` 에는 **글자(대사)만** 넣고, 음성 파일명은 넣지 않습니다.

시뮬레이터는 아래 순서로 파일명을 고릅니다.

1. 노드 `type` 이 `"sound"` 이면 보이스로 읽지 않음
2. `voice` 가 **문자열**이면 그 파일명
3. (옛 VNF) `voice` 가 객체이면 값 중 **첫 문자열 하나**만 사용 — 언어 키는 무시
4. 그래도 없으면 텍스트 노드의 `sound` 문자열

새로 만들 이벤트는 2번 형태만 쓰면 됩니다.

---

## 대사 번역과 보이스의 역할 분담

에디터 메모리에는 7개국 맵이 붙어 있지만, 디스크에는 `loc/` 로 쪼갭니다.

```json
{
  "n2": "여기야."
}
```

`chapter_assets/events/{id}/loc/ko.json` 예. `en.json` / `ja.json` 등도 같은 키를 씁니다.

| 바꿀 것 | 넣는 곳 |
|---------|---------|
| 화면 자막 (7개국) | `loc/{ko,en,ja,zh-cn,ru,es,de}.json` 의 `text_key` |
| 에디터에서 고친 원문 | 노드 `text` + 기본 언어(`ko`) 자막 |
| 일본어 보이스 | 노드 `voice` 파일명 하나 |

이 분리는 맞습니다. 보이스를 자막 파일 안에 넣거나 `{ "ko": "a.mp3", "ja": "b.mp3" }` 로 나누지 마세요.

비어 있는 언어는 `ko` 자막 → 노드 `text` 순으로 폴백합니다.

---

## 재생 채널 (보이스 vs 배경음)

시뮬레이터는 오디오를 세 채널로 나눕니다.

| 채널 | 누가 켜나 | 루프 |
|------|-----------|------|
| `voice` | 텍스트 노드의 `voice` / 레거시 `sound` | 아니오 |
| `bgm` | 사운드 노드 `role: "bgm"` | 보통 예 |
| `sfx` | 사운드 노드 `role: "sfx"` | 보통 아니오 |

그래픽·페이드 노드는 오디오를 건드리지 않습니다. 이전 보이스·BGM이 그대로 갑니다.

텍스트 노드에 들어올 때:

1. `stopVoice !== false` 이면 `voice` 채널 정지
2. `stopBgm === true` 이면 `bgm` 채널 정지
3. `voice`(또는 레거시 `sound`) 파일명이 있고 `media` 에 있으면 `voice` 채널에 재생

파일이 `media` 에 없거나 디스크에 없어도 **에러 창은 안 뜹니다.** 그 줄만 무음입니다.

---

## 사운드 노드 (보이스가 아님)

BGM·효과음은 텍스트의 `voice` 가 아니라 **`type: "sound"`** 입니다.

```json
{
  "id": "node_1710000001_cd34",
  "type": "sound",
  "role": "bgm",
  "sound": "night_loop.ogg",
  "loop": true,
  "stop": false
}
```

| 필드 | 의미 |
|------|------|
| `role` | `"bgm"` 또는 `"sfx"` |
| `sound` | `media` 의 `fileName` |
| `loop` | 반복 재생 |
| `stop` | `true` 이면 파일 없이 해당 채널만 정지 |

이 노드의 `sound` 는 보이스 채널에 안 올라갑니다.

---

## `media` 항목 (파일 카탈로그)

노드에는 **파일명만** 넣고, 실제 파일 정보는 `media` 배열에 둡니다.

```json
{
  "id": "asset_1710000002_ef56",
  "fileName": "sea_hello.mp3",
  "kind": "sound",
  "sourcePath": "chapter_assets/events/scout_a_ok/sounds/sea_hello.mp3",
  "url": "media://events/scout_a_ok/sounds/sea_hello.mp3",
  "size": 128000
}
```

| 필드 | 의미 |
|------|------|
| `fileName` | 노드 `voice` / `sound` 와 매칭하는 키 |
| `kind` | 음성은 반드시 `"sound"` |
| `sourcePath` | ZIP 또는 디스크 상대 경로 |
| `url` | 런타임 재생 URL (`blob:` 또는 `media://…`) |
| `blob` | 메모리에만 있음. **디스크 JSON에서는 빠짐** |

에디터에서 「음성 파일 추가」를 하면 `kind: "sound"` 로 `media` 에 들어가고, 그 노드의 `voice` 가 `fileName` 으로 채워집니다.

---

## 한 이벤트 안의 최소 예

```json
{
  "id": "scout_a_ok",
  "defaultLanguage": "ko",
  "nodes": [
    {
      "id": "n1",
      "type": "sound",
      "role": "bgm",
      "sound": "cafe.ogg",
      "loop": true,
      "stop": false
    },
    {
      "id": "n2",
      "type": "text",
      "speakerType": "character",
      "speaker": "sea",
      "text": "여기야.",
      "voice": "sea_01.mp3",
      "stopVoice": true,
      "stopBgm": false
    },
    {
      "id": "n3",
      "type": "text",
      "speakerType": "character",
      "speaker": "sea",
      "text": "잠깐만.",
      "voice": "",
      "stopVoice": false,
      "stopBgm": false
    },
    {
      "id": "n4",
      "type": "text",
      "speakerType": "narrator",
      "speaker": "",
      "text": "카페가 조용해졌다.",
      "voice": "",
      "stopVoice": true,
      "stopBgm": true
    }
  ],
  "media": [
    {
      "id": "m1",
      "fileName": "cafe.ogg",
      "kind": "sound",
      "sourcePath": "chapter_assets/events/scout_a_ok/sounds/cafe.ogg",
      "url": "media://events/scout_a_ok/sounds/cafe.ogg",
      "size": 0
    },
    {
      "id": "m2",
      "fileName": "sea_01.mp3",
      "kind": "sound",
      "sourcePath": "chapter_assets/events/scout_a_ok/sounds/sea_01.mp3",
      "url": "media://events/scout_a_ok/sounds/sea_01.mp3",
      "size": 0
    }
  ]
}
```

- `n2`: 보이스 `sea_01.mp3` 재생. BGM `cafe.ogg` 유지.
- `n3`: `stopVoice: false` 이고 `voice` 없음 → **이전 보이스가 이어짐**.
- `n4`: 보이스·BGM 둘 다 끔.

---

## 자주 헷갈리는 점

| 실수 | 결과 |
|------|------|
| `voice` 를 `{ "ko": "...", "ja": "..." }` 로 나눔 | 쓰지 않음. 일본어 파일명 문자열 하나만 |
| 텍스트 노드에 `role: "bgm"` 만 넣음 | 무시됨. BGM은 `type: "sound"` |
| `stopVoice: false` 를 잊고 다음 줄에 새 `voice` | 기본이 true라 이전 보이스는 끊김. 겹치려면 다음 줄에서 `stopVoice: false` |
| `voice: 0` 또는 숫자 | 파일명으로 안 읽힘 |
| `media` 에 파일 없이 노드만 수정 | 무음 (크래시 없음) |
| 스크립트 가져오기 | 대본 문법에는 음성 줄이 없음. 가져온 뒤 노드에서 `voice` 를 연결 |

스크립트 가져오기 문법은 [`event-script-import.md`](event-script-import.md) 를 보세요.
