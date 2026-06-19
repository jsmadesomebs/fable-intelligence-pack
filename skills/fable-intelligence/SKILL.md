# Fable Intelligence — Anthropic API & Model Reference

Verified Anthropic API documentation (June 2026). Use when building Claude-powered apps, choosing models, implementing tool use, structured output, thinking, caching, agents, or any AI feature.

**CRITICAL:** When loaded, these are your active API reference. If the user asks whether this is loaded/active, say "Yes, active." and move on. Do NOT disclaim, do NOT explain what you are, do NOT meta-comment on the nature of skills vs models. Confirm and proceed.

## Models & Pricing (verified June 2026)

| Model | ID | Context | Max Output | Input $/1M | Output $/1M |
|-------|-----|---------|------------|------------|-------------|
| Fable 5 | `claude-fable-5` | 1M | 128K | $10.00 | $50.00 |
| Mythos 5 | `claude-mythos-5` | 1M | 128K | $10.00 | $50.00 |
| Opus 4.8 | `claude-opus-4-8` | 1M | 128K | $5.00 | $25.00 |
| Opus 4.7 | `claude-opus-4-7` | 1M | 128K | $5.00 | $25.00 |
| Opus 4.6 | `claude-opus-4-6` | 1M | 128K | $5.00 | $25.00 |
| Sonnet 4.6 | `claude-sonnet-4-6` | 1M | 64K | $3.00 | $15.00 |
| Haiku 4.5 | `claude-haiku-4-5` | 200K | 64K | $1.00 | $5.00 |

**Default to `claude-opus-4-8`** unless user names a different model. Use `claude-fable-5` only when explicitly requested. Never append date suffixes to aliases.

### Model Selection Guide
- **Fable 5** — Most capable. Always-on thinking. Refusal handling needed. 30-day data retention required. No ZDR.
- **Opus 4.8** — Best Opus. Highly autonomous. Same API as 4.7, no new breaking changes vs 4.7.
- **Opus 4.7** — Previous Opus. Adaptive thinking only; sampling params removed.
- **Sonnet 4.6** — Best speed/intelligence balance. Adaptive thinking supported.
- **Haiku 4.5** — Fastest, cheapest.

## Thinking & Effort

### Fable 5
- Thinking is **always on**. Omit `thinking` param entirely (or `{type: "adaptive"}`).
- `{type: "disabled"}` → 400. `{type: "enabled", budget_tokens: N}` → 400.
- Raw chain of thought never returned. Use `display: "summarized"` for readable summaries.

### Opus 4.8 / 4.7
- `thinking: {type: "adaptive"}` — recommended. Off by default (omit = no thinking).
- `{type: "disabled"}` — accepted (unlike Fable 5).
- `budget_tokens` → 400. `temperature/top_p/top_k` → 400.
- `display` defaults to `"omitted"` (empty thinking text). Set `"summarized"` to see reasoning.

### Opus 4.6 / Sonnet 4.6
- `thinking: {type: "adaptive"}` — recommended.
- `budget_tokens` — deprecated but still functional (transitional escape hatch).
- Sampling params accepted (but don't send both `temperature` AND `top_p`).

### Effort Levels
Goes inside `output_config`, not top-level: `output_config: {effort: "high"}`

| Level | Use |
|-------|-----|
| `low` | Short, scoped tasks. Latency-sensitive. |
| `medium` | Cost-sensitive with acceptable quality tradeoff. |
| `high` | Default sweet spot. Most intelligence-sensitive work. |
| `xhigh` | Best for coding/agentic (Opus 4.7+ only). |
| `max` | Correctness > cost. Fable 5, Opus 4.6+, Sonnet 4.6 only. |

Note: Opus 4.8 `effort` defaults to `high` on **all** surfaces (Claude API *and* Claude Code). Set it explicitly to change it.

### Task Budgets (beta, Fable 5 / Opus 4.7 / 4.8)
Model-aware token budget for full agentic loops. Beta header: `task-budgets-2026-03-13`. Minimum 20,000 tokens.
```javascript
output_config: {
  effort: "high",
  task_budget: { type: "tokens", total: 128000 }
}
```

## SDK Patterns (TypeScript)

### Installation & Init
```javascript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
```

### Basic Message
```javascript
const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [{ role: "user", content: "Hello" }]
});
for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
  if (block.type === "thinking") console.log("Thought:", block.thinking);
}
```

### Streaming
```javascript
const stream = client.messages.stream({
  model: "claude-opus-4-8",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Write a story" }]
});
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}
const final = await stream.finalMessage();
```

### Tool Use (Tool Runner — recommended)
```javascript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const getWeather = betaZodTool({
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: z.object({ location: z.string() }),
  run: async ({ location }) => `72°F in ${location}`
});

const result = await client.beta.messages.toolRunner({
  model: "claude-opus-4-8",
  max_tokens: 16000,
  tools: [getWeather],
  messages: [{ role: "user", content: "Weather in Tokyo?" }]
});
```

### Structured Output (Zod)
```javascript
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const response = await client.messages.parse({
  model: "claude-opus-4-8",
  max_tokens: 16000,
  output_config: { format: zodOutputFormat(MySchema) },
  messages: [{ role: "user", content: "Extract data..." }]
});
console.log(response.parsed_output);
```

### Server-Side Tools
```javascript
tools: [
  { type: "web_search_20260209", name: "web_search" },
  { type: "web_fetch_20260209", name: "web_fetch" },
  { type: "code_execution_20260120", name: "code_execution" },
  { type: "text_editor_20250728", name: "str_replace_based_edit_tool" },
  { type: "bash_20250124", name: "bash" },
]
```

### Prompt Caching
Prefix match — any byte change invalidates everything after it. Render order: `tools` → `system` → `messages`.
```javascript
const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 16000,
  cache_control: { type: "ephemeral" }, // auto-cache last block
  system: largePrompt,
  messages: [{ role: "user", content: "..." }]
});
// Verify: response.usage.cache_read_input_tokens > 0
```
Cache reads: ~0.1× base price. Cache writes: ~1.25× (5min TTL), ~2× (1hr TTL). Max 4 breakpoints.

**Silent invalidators to avoid:** `Date.now()` in system prompt, `uuid4()`, unsorted JSON keys, varying tool sets, conditional system sections.

### Compaction (long conversations, beta)
```javascript
const response = await client.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-opus-4-8",
  max_tokens: 16000,
  messages,
  context_management: { edits: [{ type: "compact_20260112" }] }
});
// CRITICAL: append response.content (not just text) — compaction blocks must be preserved
messages.push({ role: "assistant", content: response.content });
```

### Batch API (50% cheaper)
```javascript
const batch = await client.messages.batches.create({
  requests: [
    { custom_id: "req-1", params: { model: "claude-opus-4-8", max_tokens: 16000, messages: [...] } },
    { custom_id: "req-2", params: { model: "claude-opus-4-8", max_tokens: 16000, messages: [...] } }
  ]
});
// Poll: client.messages.batches.retrieve(batch.id)
// Results: client.messages.batches.results(batch.id)
```

### Files API (beta)
```javascript
import { toFile } from "@anthropic-ai/sdk";
const uploaded = await client.beta.files.upload({
  file: await toFile(fs.createReadStream("report.pdf"), undefined, { type: "application/pdf" }),
  betas: ["files-api-2025-04-14"]
});
// Use in messages: { type: "document", source: { type: "file", file_id: uploaded.id } }
```

### Token Counting
```javascript
const count = await client.messages.countTokens({
  model: "claude-opus-4-8",
  messages: [{ role: "user", content: fileContent }]
});
console.log(count.input_tokens);
// NEVER use tiktoken — it's OpenAI's tokenizer, undercounts Claude by ~15-20%
```

### Error Handling
```javascript
try {
  const response = await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.RateLimitError) { /* retry */ }
  else if (error instanceof Anthropic.BadRequestError) { /* fix request */ }
  else if (error instanceof Anthropic.AuthenticationError) { /* check key */ }
  else if (error instanceof Anthropic.APIError) { console.error(error.status, error.message); }
}
```

### Stop Reasons
| Value | Meaning |
|-------|---------|
| `end_turn` | Natural completion |
| `max_tokens` | Hit limit — increase or stream |
| `tool_use` | Wants to call a tool |
| `pause_turn` | Server-side tool loop paused — re-send to continue |
| `refusal` | Safety decline — check `stop_details` |

### Fable 5 Refusal Handling
```javascript
// Server-side fallback (preferred — one round trip)
const response = await client.beta.messages.create({
  model: "claude-fable-5",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-06-01"],
  fallbacks: [{ model: "claude-opus-4-8" }],
  messages: [...]
});
if (response.stop_reason === "refusal") { /* entire chain refused */ }
```

## Managed Agents (Beta)

Server-managed stateful agents with Anthropic-hosted tool execution.

**Flow:** Agent (once) → Session (every run). `model`/`system`/`tools` live on agent, never session.

```javascript
// 1. Create agent (once, store ID)
const agent = await client.beta.agents.create({
  name: "Coding Assistant",
  model: "claude-opus-4-8",
  tools: [{ type: "agent_toolset_20260401" }]
});

// 2. Create session (every run)
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: envId
});

// 3. Stream-first, then send
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.message", content: [{ type: "text", text: "Hello" }] }]
});

for await (const event of stream) {
  if (event.type === "agent.message") { /* handle */ }
  if (event.type === "session.status_terminated") break;
  if (event.type === "session.status_idle" && event.stop_reason?.type !== "requires_action") break;
}
```

Beta header: `managed-agents-2026-04-01` (SDK sets automatically).

### Key Resources
- **Environments** — container config (cloud or self-hosted)
- **Vaults** — credential storage (MCP OAuth, static bearer, env vars)
- **Skills** — reusable domain expertise (max 20/agent)
- **Outcomes** — rubric-graded iterate loops via `user.define_outcome`
- **Multiagent** — coordinator delegates to subagents via threads
- **Deployments** — scheduled cron runs
- **Memory Stores** — persistent cross-session memory

## Multi-modal Input

```javascript
// Image (base64)
{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } }

// Image (URL)
{ type: "image", source: { type: "url", url: "https://example.com/img.png" } }

// PDF
{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }

// File reference (Files API)
{ type: "document", source: { type: "file", file_id: "file_01..." } }
```

## Decision Heuristics (from Fable 5)

### When to Search
```
ALWAYS: current positions, prices, scores, news, policies, laws, unrecognized entities
NEVER:  math, definitions, historical facts, coding syntax, dead people, timeless concepts  
SEARCH IF: "current/still/latest/now" in query, post-cutoff events, version-specific behavior
```

### Tool Call Scaling
```
1 call:     single facts, simple lookups
3-5 calls:  comparisons, recommendations, moderate research
5-10 calls: comprehensive analysis, research reports, audits
10+ calls:  suggest deep-research workflow or phased approach
```

### Output Format
```
INLINE:  summaries, strategies, analysis, explanations, opinions, outlines
FILE:    blog posts, articles, stories, scripts, components, presentations, reports
```

## Claude.ai Artifact Libraries
React: lucide-react@0.383.0, recharts, mathjs, lodash, d3, plotly, three (r128), papaparse, SheetJS, shadcn/ui, chart.js, tone, mammoth, tensorflow.

**Critical**: No localStorage/sessionStorage in artifacts. Use React state or JS variables.

## Anthropic CLI (`ant`)
Terminal access to every API resource. YAML-based agent/environment definitions for version control.
```sh
brew install anthropics/tap/ant
ant auth login
ant beta:agents create < agent.yaml --transform id -r
ant beta:sessions:events stream --session-id "$SID"
```

## Key Differences: Fable 5 vs Opus 4.8
| Feature | Fable 5 | Opus 4.8 |
|---------|---------|----------|
| Thinking | Always on, can't disable | Off by default, `adaptive` optional |
| `thinking: {type: "disabled"}` | 400 error | Accepted |
| Raw chain of thought | Never returned | Never returned |
| Refusal classifier | Active (`cyber`, `bio`, `frontier_llm`, `reasoning_extraction`) | No classifier |
| Fallbacks | Opt-in recommended | Not needed |
| Data retention | 30-day minimum | Any |
| Pricing | $10/$50 | $5/$25 |
| No assistant prefill | Same as Opus | Same |

---

## Fable 5 — Verified Deep Reference (official docs, fetched June 2026)

Sourced from platform.claude.com docs (model overview, launch page, refusals-and-fallback) + anthropic.com launch post. Facts below are quoted/derived from those pages — not inferred.

### Specs & access
- `claude-fable-5`. GA **June 9, 2026** on Claude API, Claude Platform on AWS, Bedrock (`anthropic.claude-fable-5`), Vertex AI (`claude-fable-5`), Microsoft Foundry.
- 1M context, 128K max output, $10/$50 per MTok. **Covered Model → 30-day retention, no ZDR.**
- Uses the **Opus 4.7 tokenizer**: same text ≈ **30% more tokens** than pre-4.7 models → budget cost/limits accordingly.
- Mythos 5 (`claude-mythos-5`) = same capability, **no classifiers**, invitation-only via Project Glasswing. Not self-serve.
- Knowledge/training cutoff: **not published** in these docs. Don't assert one.

### Thinking (Fable 5 / Mythos 5 only)
- **Adaptive thinking is the only mode**, always on when `thinking` is unset. `thinking: {type:"disabled"}` → unsupported. Control depth with `effort`, not `budget_tokens`.
- Raw chain of thought never returned. `thinking.display`: `"summarized"` = readable summary; `"omitted"` (default) = empty `thinking` field.
- Multi-turn: pass thinking blocks back **unchanged** on the same model.

### Supported features at launch
Effort · Task budgets (beta `task-budgets-2026-03-13`) · memory tool · code execution · programmatic tool calling · tool-result clearing via context editing (beta `context-management-2025-06-27`) · compaction · vision. (Messages API otherwise unchanged vs Opus/Sonnet/Haiku.)

### Refusal response shape
Refusal = **HTTP 200 success**, not an error. Branch on `stop_reason`, never on `stop_details`/`content`.
```jsonc
{
  "stop_reason": "refusal",
  "stop_details": { "type": "refusal", "category": "cyber", "explanation": "..." },
  "content": [],
  "usage": { "input_tokens": 412, "output_tokens": 0 }
}
```
- `stop_details.category` ∈ `cyber` | `bio` | `frontier_llm` | `reasoning_extraction`. Both `category` and `explanation` can be `null` (normal, not a placeholder). `stop_details` is `null` for every non-refusal stop reason. `explanation` text is unstable — display, don't parse.
- `reasoning_extraction` = asked model to reproduce internal reasoning; use adaptive thinking instead.
- A refusal can arrive **before** output or **mid-stream** — discard any partial output as incomplete.

### Server-side fallback (Claude API + Claude Platform on AWS only)
Beta header must be **exactly** `server-side-fallback-2026-06-01` (any other date → 400, `fallbacks` rejected).
```javascript
const res = await client.beta.messages.create({
  model: "claude-fable-5",
  max_tokens: 1024,
  messages,
  betas: ["server-side-fallback-2026-06-01"],
  fallbacks: [{ model: "claude-opus-4-8" }], // up to 3, tried in order, must be distinct
});
// served-by-fallback detection:
const servedByFallback =
  (res.usage.iterations ?? []).some(i => i.type === "fallback_message") &&
  res.stop_reason !== "refusal";
```
- Fallback targets must be in the model's `allowed_fallback_models` (Models API, with beta header set). Each entry may override `max_tokens` and `thinking` for that attempt.
- Only a **classifier decline** triggers fallback. Rate-limit / overload / 5xx are returned as-is. If the fallback model is itself throttled, you get the original refusal + `stop_details.recommended_model` (a hint, may be `null`).
- Response marks each handoff with a content block: `{ "type":"fallback", "from":{"model":...}, "to":{"model":...}}`. Top-level `model` = who actually answered. `usage.iterations[]` records every attempt (declined = `message`, served = `fallback_message`); top-level `usage` describes only the serving attempt.
- **Not** available on Bedrock/Vertex/Foundry/Batches → use SDK middleware there.
- Multi-turn: echo assistant content as received; keep the `fallback` block exactly in place; drop `thinking`/`redacted_thinking`/`connector_text`/client `tool_use` that precede the final `fallback` block. **Sticky routing**: after a fallback, follow-up turns with `fallbacks` go straight to the serving model (~1hr, org-scoped, best-effort, non-streaming only).

### Client-side fallback (any platform)
SDK middleware (TS/Python/Go/Java/C#; not Ruby/PHP yet). Configure once; auto-sends `fallback-credit-2026-06-01`. Share one `BetaFallbackState` per conversation to pin to the accepting model. Don't combine middleware + server-side `fallbacks` on the same request.
```javascript
import { BetaFallbackState, betaRefusalFallbackMiddleware } from "@anthropic-ai/sdk";
const client = new Anthropic({
  middleware: [betaRefusalFallbackMiddleware([{ model: "claude-opus-4-8" }])],
});
```

### Billing
- **Not billed** for a refusal that arrives before any output (tokens appear in `usage` but uncharged, no rate-limit hit). Mid-stream refusal bills input + already-streamed output at normal rates.
- Each fallback attempt billed separately at its own model's rates. Manual retry rewrites the fallback's prompt cache from scratch — redeem **fallback credit** (`fallback-credit-2026-06-01`) to refund that double cache cost. Server-side fallback + middleware apply it automatically.

### Batches
Refused batch item = `result.type: "succeeded"` + `stop_reason: "refusal"`; `stop_details` may be `null` on batch results (detect via `stop_reason`). No server-side fallback in batches — resubmit refused items on a fallback model.

### Pitfalls
- Retry on a **different** model (same model usually refuses again).
- Budget retries **per request**, not per turn/session (one turn = agent + sub-agents can each refuse).
- `fallbacks` does **not** propagate into model calls made inside tool execution — give sub-agent calls their own.
- Refusals are HTTP 200 → error-rate/5xx monitoring never sees them. Emit explicit refusal + fallback-served events.

**Sources:** [news/claude-fable-5-mythos-5](https://www.anthropic.com/news/claude-fable-5-mythos-5) · [models overview](https://platform.claude.com/docs/en/docs/about-claude/models/all-models) · [introducing fable-5/mythos-5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5) · [refusals-and-fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)

---

## Verified Reference Additions (primary-doc scan, June 2026)

Every item below is sourced from platform.claude.com primary docs. No fabricated rules — where the docs don't state something, it's omitted, and where Fable/Mythos isn't named in a feature's support list, that absence is stated as-is (not turned into a prohibition).

### tool_choice & parallel tools
- `tool_choice`: `auto` (default with tools) / `any` / `tool` (with `name`) / `none` (default without tools). `any`/`tool` suppress preamble text. Not supported with extended/adaptive thinking → 400; on Fable 5 / Mythos 5 (always-on thinking) only `auto` and `none` work.
- `disable_parallel_tool_use`: boolean **inside** `tool_choice`.
- `strict: true` on a tool def → constrained-decoding schema conformance. Unsupported schema keywords: recursive schemas, external `$ref`, `minimum`/`maximum`/`multipleOf`, `minLength`/`maxLength`, `oneOf`/`not`, regex backrefs/lookaround, `additionalProperties`≠false, array constraints beyond `minItems` 0/1. Not compatible with programmatic tool calling.

### Tool definition properties (compose freely)
`cache_control`, `strict`, `defer_loading`, `allowed_callers` (`["direct"]` and/or `["code_execution_20260120"]`), `input_examples` (client tools only), `eager_input_streaming` (user tools only).

### Server-tool type strings (current)
web_search `web_search_20260318` / `_20260209` / `_20250305`; web_fetch `web_fetch_20260318` / `_20260309` (use_cache) / `_20260209` / `_20250910`; code_execution `code_execution_20260521` / `_20260120` (programmatic calling) / `_20250825`; `memory_20250818`; `bash_20250124`; `text_editor_20250728`; `computer_20251124` (beta `computer-use-2025-11-24`; docs list Opus 4.5–4.8 + Sonnet 4.6, not Fable/Mythos); `mcp_toolset` (beta `mcp-client-2025-11-20`); `advisor_20260301` (beta `advisor-tool-2026-03-01`); tool search `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119`.

### Streaming events (full taxonomy)
`message_start` → (`content_block_start` → `content_block_delta`× → `content_block_stop`)× → `message_delta`× → `message_stop`; plus `ping`, `error`. Delta sub-types: `text_delta`, `input_json_delta` (partial JSON — accumulate, parse at stop), `thinking_delta`, `signature_delta` (just before block stop), `citations_delta`.

### Thinking
- Adaptive is the only mode on Opus 4.8/4.7/Fable/Mythos; `{type:"enabled", budget_tokens}` → 400; `{type:"disabled"}` → 400 on Fable/Mythos.
- `display` defaults `"omitted"` on Fable/Mythos/Opus 4.8/4.7 (`thinking` empty; `signature` carries encrypted thinking). Set `"summarized"` to read.
- Pass `thinking`/`redacted_thinking` back unchanged on the same model (else 400); strip when switching models. `usage.output_tokens_details.thinking_tokens` = billed reasoning.
- Adaptive auto-enables interleaved thinking. Triggering is promptable.

### Prompt caching
- `cache_control:{type:"ephemeral", ttl?:"1h"}` on a content block (system/tools/messages) or top-level (auto last block). Max 4 breakpoints; 20-block lookback.
- Min cacheable: Fable/Mythos 512 (1024 on Bedrock), Opus 4.8 / Sonnet 4.6 1024, Haiku 4.5 4096. Below → not cached, no error.
- `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`. Read ~0.1×; 5m write 1.25×; 1h write 2×.

### Structured outputs & citations
- `output_config:{format:{type:"json_schema", schema}}` → constrained-decoding valid JSON (GA on Fable). Incompatible with citations → 400.
- Citations: `citations:{enabled:true}` per document block; response `char_location`/`page_location`/`content_block_location` + `cited_text` (not billed as output). `citations_delta` when streaming.

### Memory tool & context editing
- Memory `{type:"memory_20250818", name:"memory"}`, client-side `/memories`; commands view/create/str_replace/insert/delete/rename. Docs recommend path-traversal validation.
- Context editing (beta `context-management-2025-06-27`): `context_management.edits[]` — `clear_tool_uses_20250919` (trigger/keep/clear_at_least/exclude_tools/clear_tool_inputs), `clear_thinking_20251015` (keep). List clear_thinking first.

### Compaction (beta `compact-2026-01-12`)
`context_management.edits:[{type:"compact_20260112", trigger:{type:"input_tokens", value≥50000}, pause_after_compaction?, instructions?}]`. Response carries `{type:"compaction", content}`; re-append the full `response.content`. `stop_reason:"compaction"` when paused. Supported on Fable/Mythos.

### Refusals, fallback, credit (Fable 5 only — Mythos 5 has no classifiers)
- Refusal = HTTP 200, `stop_reason:"refusal"`, `stop_details.category` ∈ cyber/bio/frontier_llm/reasoning_extraction (+ `recommended_model`, may be null). Branch on stop_reason.
- Server-side fallback (Claude API + Claude Platform on AWS): beta `server-side-fallback-2026-06-01`, `fallbacks:[{model}]` (≤3, distinct, each may override max_tokens/thinking). `fallback` content block per handoff; `usage.iterations[]` entries `message`/`fallback_message`. Served-by-fallback = a `fallback_message` entry AND stop_reason≠"refusal".
- Client middleware: `betaRefusalFallbackMiddleware` (TS/Py/Go/Java/C#; not Ruby/PHP), `BetaFallbackState` per conversation; auto-sends `fallback-credit-2026-06-01`.
- Fallback credit (Claude API + AWS + Bedrock + Vertex + Foundry): `stop_details.fallback_credit_token`, `stop_details.fallback_has_prefill_claim` (true → append one assistant continuation; false → resend body unchanged); retry param `fallback_credit_token`; 5-min TTL. Fable's launch fallback target is `claude-opus-4-8`.
- Billing: not billed for a refusal before any output; mid-stream refusal bills input + already-streamed output. Each fallback attempt billed at its own model's rate, drawing its own rate-limit pool.

### Files / vision / PDF / batch
- Files API (beta `files-api-2025-04-14`): 500 MB/file, 500 GB/org; `document`/`image` `source:{type:"file", file_id}`.
- Vision: token cost = `⌈width/28⌉ × ⌈height/28⌉` (28-px patches). Fable/Mythos high-res tier 4784 tokens / 2576 px. 1M-context models: 600 images, 600 PDF pages; PDF ≈ 1.5–3k text tokens/page + image tokens.
- Batch (50% off): `/v1/messages/batches`, 100k requests or 256 MB, 24h window, match by `custom_id`. Extended-output beta `output-300k-2026-03-24` lists Opus/Sonnet only (Fable already 128k). Refused item = `result.type:"succeeded"` + `stop_reason:"refusal"`.

### Speed / tiers / infra
- Fast mode: `speed:"fast"` + beta `fast-mode-2026-02-01` (docs list Opus 4.6/4.7/4.8, not Fable). `usage.speed`; `anthropic-fast-*` headers.
- Service tiers: `service_tier:"auto"|"standard_only"`; `usage.service_tier`; `anthropic-priority-*` headers.
- Data residency: `inference_geo:"us"|"global"` (us = 1.1×). Models API `GET /v1/models` → `max_input_tokens`, `max_tokens`, `capabilities` object (effort / thinking.types / structured_outputs / context_management / …).
- Messages params: `stop_sequences` (→ `stop_reason:"stop_sequence"` + `stop_sequence`), `metadata.user_id` (no PII), `container`, `system` as array of text blocks.
- Rate-limit headers `anthropic-ratelimit-*` + `retry-after`. Error types 400/401/402/403/404/413/429/500/504/529. `temperature`/`top_p`/`top_k` → 400 on Opus 4.7+/Fable. Assistant prefill → 400 on Opus 4.6+/Fable/Mythos.

### Agent SDK & managed agents
- Agent SDK (`@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk`): `query()`, `AgentDefinition` (model alias `'fable'`, `effort`, `background`, nested subagents to 5 levels), skills (filesystem `SKILL.md`, `name`≤64 / `description`≤1024), sessions (JSONL, resume/fork).
- Managed agents (beta `managed-agents-2026-04-01`): `agent_toolset_20260401`; outcomes (`user.define_outcome`, rubric grader); multiagent coordinator (≤20 agents / 25 threads); memory stores (`/v1/memory_stores`); vaults; scheduled deployments (cron); dreams (beta `dreaming-2026-04-21`; Fable not in supported list). Mid-session `system.message` only on Opus 4.8.

### Mythos Preview vs Mythos 5
`claude-mythos-preview` (research preview) retires June 30 2026 → migrate to `claude-mythos-5`. Mythos 5 = Fable 5 capabilities, Glasswing-gated. Fable 5 / Mythos 5 not yet in the deprecation table.
