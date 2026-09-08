#!/usr/bin/env node
/**
 * MCP Router — 그룹 단위로 백엔드 MCP 서버를 지연 로드하고,
 * 스킬(SKILL.md)을 요청 시에만 읽어 토큰 소모를 줄이는 라우터.
 *
 * - 평소에는 라우터의 고정 도구 4개만 컨텍스트에 노출됩니다.
 * - `mcp_activate_group`을 호출할 때만 해당 그룹의 백엔드 서버가 스폰되고
 *   도구가 동적 등록됩니다.
 * - 스킬 전용 그룹은 `mcp_read_skill`로 내용을 필요할 때만 읽습니다.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "..", "config", "groups.json");

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
const groups = config.groups ?? {};

/** 활성 그룹 → (서버명 → { client, transport, tools, server }) */
const active = new Map();
/** 프리픽스된 도구명 → { group, server, tool } */
const routes = new Map();

const prefixed = (group, server, tool) => `${group}.${server}.${tool}`;

function groupSkills(group) {
  return groups[group]?.skills ?? [];
}

function fixedTools() {
  return [
    {
      name: "mcp_list_groups",
      description:
        "사용 가능한 MCP 그룹 목록과 각 그룹의 설명/구성을 반환합니다. 작업 시작 시 먼저 호출해 필요한 그룹만 활성화하세요.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "mcp_activate_group",
      description:
        "특정 그룹을 활성화합니다. 그룹에 속한 백엔드 MCP 서버를 지연 기동하고 도구를 등록합니다. (스킬 전용 그룹은 mcp_read_skill로 내용을 로드하세요.)",
      inputSchema: {
        type: "object",
        properties: {
          group: { type: "string", description: "활성화할 그룹명 (mcp_list_groups로 확인)" },
        },
        required: ["group"],
      },
    },
    {
      name: "mcp_deactivate_group",
      description:
        "활성화된 그룹을 비활성화합니다. 백엔드 MCP 서버 프로세스를 종료하고 등록된 도구를 제거합니다.",
      inputSchema: {
        type: "object",
        properties: {
          group: { type: "string", description: "비활성화할 그룹명" },
        },
        required: ["group"],
      },
    },
    {
      name: "mcp_read_skill",
      description:
        "그룹 내 스킬(SKILL.md) 내용을 요청 시에만 읽어옵니다. group만 주면 해당 그룹의 모든 스킬을, skill까지 주면 특정 스킬만 읽습니다.",
      inputSchema: {
        type: "object",
        properties: {
          group: { type: "string", description: "스킬이 속한 그룹명" },
          skill: { type: "string", description: "(선택) 특정 스킬명. 생략 시 그룹 전체 스킬" },
        },
        required: ["group"],
      },
    },
  ];
}

function currentTools() {
  const tools = [...fixedTools()];
  for (const [group, servers] of active) {
    for (const [serverName, entry] of servers) {
      for (const t of entry.tools) {
        tools.push({
          name: prefixed(group, serverName, t.name),
          description: `[${group}/${serverName}] ${t.description ?? t.name}`,
          inputSchema: t.inputSchema ?? { type: "object", properties: {} },
        });
      }
    }
  }
  return tools;
}

function resolveSpawn(server) {
  const command = server.command;
  const args = [...(server.args ?? [])];
  if (/\.(cmd|bat)$/i.test(command)) {
    return { command: "cmd.exe", args: ["/c", command, ...args] };
  }
  return { command, args };
}

async function activateGroup(groupName) {
  if (!groups[groupName]) {
    return { ok: false, message: `알 수 없는 그룹: '${groupName}'. mcp_list_groups로 확인하세요.` };
  }
  const group = groups[groupName];
  const lines = [];
  const failures = [];

  if (!active.has(groupName)) active.set(groupName, new Map());
  const serversMap = active.get(groupName);

  for (const server of group.servers ?? []) {
    if (serversMap.has(server.name)) continue;
    try {
      const { command, args } = resolveSpawn(server);
      const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...(server.env ?? {}) },
        stderr: "inherit",
      });
      const client = new Client({ name: `router-backend-${server.name}`, version: "1.0.0" });
      await client.connect(transport);
      const listed = await client.listTools();
      const tools = listed.tools ?? [];
      serversMap.set(server.name, { client, transport, tools, server });
      for (const t of tools) {
        routes.set(prefixed(groupName, server.name, t.name), {
          group: groupName,
          server: server.name,
          tool: t.name,
        });
      }
      lines.push(`✓ ${server.name}: 도구 ${tools.length}개 등록`);
    } catch (err) {
      failures.push(`${server.name}: ${err.message}`);
    }
  }

  const skills = groupSkills(groupName);
  if (skills.length) {
    lines.push(`스킬 ${skills.length}개: ${skills.map((s) => s.name).join(", ")} (mcp_read_skill로 로드)`);
  }
  if ((group.servers ?? []).length === 0) {
    lines.push(`'${groupName}'는 스킬 전용 그룹입니다. mcp_read_skill(group="${groupName}")로 내용을 로드하세요.`);
  }

  await server.sendToolListChanged().catch(() => {});
  return {
    ok: failures.length === 0,
    message: lines.join("\n") + (failures.length ? "\n실패: " + failures.join("; ") : ""),
  };
}

async function deactivateGroup(groupName) {
  const serversMap = active.get(groupName);
  if (!serversMap) {
    return { ok: false, message: `그룹 '${groupName}'은(는) 활성화되어 있지 않습니다.` };
  }
  const lines = [];
  for (const [serverName, entry] of serversMap) {
    try {
      for (const t of entry.tools) routes.delete(prefixed(groupName, serverName, t.name));
      await entry.client.close();
      lines.push(`✓ ${serverName} 종료`);
    } catch (err) {
      lines.push(`⚠ ${serverName} 종료 중 오류: ${err.message}`);
    }
  }
  active.delete(groupName);
  await server.sendToolListChanged().catch(() => {});
  return { ok: true, message: lines.join("\n") };
}

async function readSkill(groupName, skillName) {
  if (!groups[groupName]) return { ok: false, message: `알 수 없는 그룹: '${groupName}'` };
  const skills = groupSkills(groupName).filter((s) => !skillName || s.name === skillName);
  if (!skills.length) return { ok: false, message: `그룹 '${groupName}'에 읽을 스킬이 없습니다.` };

  const parts = [];
  for (const s of skills) {
    try {
      const content = await readFile(s.path, "utf8");
      parts.push(`### ${s.name}\n\n${content}`);
      const refDir = path.join(path.dirname(s.path), "references");
      try {
        await access(refDir);
        const files = await readdir(refDir);
        parts.push(`\n--- ${s.name} 참조 파일: ${files.join(", ")} ---`);
      } catch {
        /* references 없음 */
      }
    } catch (err) {
      parts.push(`### ${s.name}\n\n[읽기 실패: ${err.message}]`);
    }
  }
  return { ok: true, message: parts.join("\n\n") };
}

async function callFixed(name, args) {
  switch (name) {
    case "mcp_list_groups": {
      const summary = Object.entries(groups).map(([gname, g]) => ({
        group: gname,
        description: g.description ?? "",
        active: active.has(gname),
        servers: (g.servers ?? []).map((s) => s.name),
        skills: (g.skills ?? []).map((s) => s.name),
      }));
      return { ok: true, message: JSON.stringify(summary, null, 2) };
    }
    case "mcp_activate_group":
      return activateGroup(args.group);
    case "mcp_deactivate_group":
      return deactivateGroup(args.group);
    case "mcp_read_skill":
      return readSkill(args.group, args.skill);
    default:
      return null;
  }
}

async function routeCall(name, args) {
  const route = routes.get(name);
  if (!route) {
    return {
      content: [{ type: "text", text: `알 수 없는 도구: '${name}'` }],
      isError: true,
    };
  }
  const entry = active.get(route.group)?.get(route.server);
  if (!entry) {
    return {
      content: [
        {
          type: "text",
          text: `그룹 '${route.group}'가 비활성화 상태입니다. mcp_activate_group(group="${route.group}")으로 먼저 활성화하세요.`,
        },
      ],
      isError: true,
    };
  }
  try {
    const result = await entry.client.callTool({ name: route.tool, arguments: args ?? {} });
    return {
      content: result.content ?? [],
      structuredContent: result.structuredContent,
      isError: !!result.isError,
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `도구 호출 실패 (${route.server}/${route.tool}): ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}

const server = new Server(
  { name: "mcp-router", version: "1.0.0" },
  { capabilities: { tools: { listChanged: true } } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: currentTools() }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params ?? {};
  const fixed = await callFixed(name, args ?? {});
  if (fixed) {
    return {
      content: [{ type: "text", text: fixed.message ?? "" }],
      isError: !fixed.ok,
    };
  }
  return routeCall(name, args ?? {});
});

const transport = new StdioServerTransport();
await server.connect(transport);
