#!/usr/bin/env node
/**
 * Fable helpers — a no-network MCP server exposing the library's pure (offline)
 * helpers as Claude Code tools. No API key required; nothing here calls the
 * Anthropic API. Registered via the plugin's .mcp.json.
 *
 * Requires: npm install  (@modelcontextprotocol/sdk, zod)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { classifyQuery } from "../src/lib/decision-engine.js";
import { pickModel, maxCapability } from "../src/lib/capability.js";
import { defineTool } from "../src/lib/tool-builder.js";

const json = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: "fable-helpers", version: "1.0.0" });

server.registerTool(
  "classify_query",
  {
    description:
      "Classify a query: whether to search, tool-call scale, output format (file vs inline), complexity. Pure heuristics, no network.",
    inputSchema: { query: z.string().describe("The user query to classify") },
  },
  async ({ query }) => json(classifyQuery(query)),
);

server.registerTool(
  "pick_model",
  {
    description:
      "Route to the best model id for a task domain. General/coding -> claude-fable-5; security/cyber/bio -> claude-opus-4-8 (Fable routes those to an Opus fallback anyway).",
    inputSchema: {
      domain: z
        .string()
        .optional()
        .describe("Task domain, e.g. 'coding', 'network intrusion detection', 'biology'"),
    },
  },
  async ({ domain }) => json({ model: pickModel({ domain }) }),
);

server.registerTool(
  "max_capability",
  {
    description:
      "Return a high-capability request options bundle (effort, adaptive thinking, task budget) to spread into a model call.",
    inputSchema: {
      effort: z.string().optional().describe("Override effort, e.g. 'xhigh' or 'max'"),
    },
  },
  async ({ effort }) => json(maxCapability(effort ? { effort } : {})),
);

server.registerTool(
  "build_tool",
  {
    description:
      "Build an Anthropic tool definition (input_schema JSON) from a simple params map. Pure, no network.",
    inputSchema: {
      name: z.string().describe("Tool name"),
      description: z.string().describe("Tool description"),
      params: z
        .record(z.any())
        .describe("Map of param name -> JSON-schema fragment (add required:false to make a param optional)"),
      strict: z.boolean().optional().describe("Set true to guarantee schema-valid inputs"),
    },
  },
  async ({ name, description, params, strict }) =>
    json(defineTool(name, description, params, { strict })),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("fable-helpers MCP server running on stdio (no API key, no network)");
}

main().catch((err) => {
  console.error("fable-helpers server error:", err);
  process.exit(1);
});
