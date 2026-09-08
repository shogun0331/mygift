# MCP 라우터 (그룹 기반 지연 로딩)

MCP 서버·스킬이 전부 상시 로드되어 토큰 소모가 과다한 문제를 해결하기 위한 라우터입니다.
평소에는 라우터의 고정 도구 4개만 노출되고, 필요한 그룹만 활성화하여 백엔드 MCP 서버를
지연 스폰하고 스킬을 요청 시에만 읽습니다.

## 구조
```
.mcp/
├── router/
│   ├── index.mjs          # 라우터 본체 (stdio MCP 서버)
│   ├── package.json       # @modelcontextprotocol/sdk 의존성
│   └── node_modules/      # (설치 시 생성, gitignore)
├── config/
│   ├── groups.json        # 실제 그룹 설정 (시크릿 포함, gitignore)
│   └── groups.example.json# 템플릿 (시크릿 제외)
└── README.md
```

## 고정 도구 (항상 노출)
| 도구 | 설명 |
|---|---|
| `mcp_list_groups` | 그룹 목록·설명·구성 반환 |
| `mcp_activate_group` | 그룹의 백엔드 MCP 서버 지연 스폰 + 도구 동적 등록 |
| `mcp_deactivate_group` | 백엔드 프로세스 종료 + 도구 제거 |
| `mcp_read_skill` | 그룹 내 스킬(SKILL.md)을 요청 시에만 읽기 |

백엔드 서버의 도구는 활성화 시 `<group>.<server>.<tool>` 형태로 동적 등록됩니다.

## 그룹
| 그룹 | 내용 |
|---|---|
| `image-gen` | fooocus-local, simpligen, h3-prompt-writing |
| `game-dev` | godot |
| `pinokio` | gepeto, pinokio |
| `coordination` | paperclip |
| `project-context` | broadcast-game, para-memory-files |
| `diagnostics` | diagnose-why-work-stopped, terminal-bench-loop |

## 사용 흐름 (에이전트)
1. `mcp_list_groups`로 필요한 그룹 파악
2. `mcp_activate_group({group})`으로 백엔드 서버 기동
3. (스킬 전용 그룹) `mcp_read_skill({group})`으로 내용 로드
4. 작업 후 `mcp_deactivate_group({group})`으로 정리

## 그룹 추가/수정
`config/groups.json`을 편집합니다.
- `servers`: 백엔드 MCP 서버(stdin/stdout) — `command`, `args`, `env`, `cwd`(선택)
- `skills`: 스킬 SKILL.md 절대경로 목록

Windows 참고: `.cmd`/`.bat` 명령은 라우터가 자동으로 `cmd.exe /c`로 감싸 실행합니다.
`npx`는 `npx.cmd`로 지정하세요.

## Cursor 연결
`C:\Users\shogu\.cursor\mcp.json`에 라우터 1개만 등록합니다:
```json
{
  "mcpServers": {
    "mcp-router": {
      "command": "node",
      "args": ["F:/Broadcast/broadcast-game/.mcp/router/index.mjs"]
    }
  }
}
```
기존 개별 서버(fooocus/simpligen/godot)는 그룹 내부로 이동했으므로 전역 등록에서 제거합니다.

## 보안
`config/groups.json`에는 `SIMPLIGEN_TOKEN` 등 시크릿이 포함되므로 `.gitignore`에 등록되어
있습니다. 복제/공유 시 `groups.example.json`을 복사해 `groups.json`을 만들어 사용하세요.
