#!/usr/bin/env node
/**
 * Fable helpers — zero-dependency MCP server (raw JSON-RPC 2.0 over stdio).
 *
 * No SDK, no zod, no `npm install`: runs on plain `node`. Exposes the library's
 * pure, no-network helpers as Claude Code tools. No API key, no network.
 *
 * MCP stdio framing: newline-delimited JSON-RPC messages on stdin/stdout; logs
 * go to stderr.
 */

import { classifyQuery } from "../src/lib/decision-engine.js";
import { pickModel, maxCapability } from "../src/lib/capability.js";
import { defineTool } from "../src/lib/tool-builder.js";

const SERVER = { name: "fable-helpers", version: "1.0.0" };

// name -> { description, inputSchema (plain JSON Schema), run(args) }
const TOOLS = {
  classify_query: {
    description:
      "Classify a query: whether to search, tool-call scale, output format (file vs inline), complexity. Pure heuristics, no network.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "The user query to classify" } },
      required: ["query"],
    },
    run: ({ query }) => classifyQuery(String(query ?? "")),
  },
  pick_model: {
    description:
      "Route to the best model id for a task domain. General/coding -> claude-fable-5; security/cyber/bio -> claude-opus-4-8 (Fable routes those to an Opus fallback anyway).",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "Task domain, e.g. 'coding' or 'network intrusion detection'" } },
    },
    run: ({ domain }) => ({ model: pickModel({ domain }) }),
  },
  max_capability: {
    description:
      "Return a high-capability request options bundle (effort, adaptive thinking, task budget) to spread into a model call.",
    inputSchema: {
      type: "object",
      properties: { effort: { type: "string", description: "Override effort, e.g. 'xhigh' or 'max'" } },
    },
    run: ({ effort }) => maxCapability(effort ? { effort } : {}),
  },
  build_tool: {
    description: "Build an Anthropic tool definition (input_schema JSON) from a simple params map. Pure, no network.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tool name" },
        description: { type: "string", description: "Tool description" },
        params: { type: "object", description: "Map of param name -> JSON-schema fragment" },
        strict: { type: "boolean", description: "Guarantee schema-valid inputs" },
      },
      required: ["name", "description", "params"],
    },
    run: ({ name, description, params, strict }) => defineTool(name, description, params || {}, { strict }),
  },
};

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
const ok = (id, res) => send({ jsonrpc: "2.0", id, result: res });
const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

function handle(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: params?.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: SERVER,
    });
  }
  // Notifications carry no id and need no response.
  if (method === "notifications/initialized" || method === "initialized") return;
  if (method === "ping") return ok(id, {});

  if (method === "tools/list") {
    return ok(id, {
      tools: Object.entries(TOOLS).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }

  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) return fail(id, -32602, `Unknown tool: ${params?.name}`);
    try {
      const out = tool.run(params?.arguments || {});
      return ok(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
    } catch (e) {
      return ok(id, { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
    }
  }

  if (id !== undefined) return fail(id, -32601, `Method not found: ${method}`);
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    try {
      handle(msg);
    } catch (e) {
      if (msg && msg.id !== undefined) fail(msg.id, -32603, e.message);
    }
  }
});
process.stdin.on("end", () => process.exit(0));
console.error("fable-helpers MCP server (zero-dep) running on stdio");
