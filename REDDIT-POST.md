# I extracted Fable 5's actual system prompt, cross-referenced it with official docs, and built 2 skills + a full JS library. Any Claude Code instance that loads them becomes significantly smarter.

**TL;DR:** Two drop-in skills + a code library. One gives Claude complete, verified API knowledge (models, pricing, SDK patterns, managed agents, refusal handling). The other injects Fable 5's behavioral intelligence (response quality, search heuristics, formatting rules, classifier-aware communication). Plus a full JavaScript library for building Claude-powered apps.

---

## The problem

Claude Code doesn't inherently know its own API docs. Ask it to build something with the Claude API and it'll use outdated model IDs, set parameters that 400 on newer models, and miss features like adaptive thinking, effort levels, task budgets, and managed agents. It also doesn't have Fable 5's refined behavioral heuristics — when to search, how to scale tool calls, how to format responses.

## What I did

1. Got the actual Fable 5 system prompt (the production one from claude.ai — 1,600 lines of behavioral rules, tool definitions, search heuristics, artifact patterns)
2. Cross-referenced everything against the official `claude-api` skill documentation
3. Split the intelligence into two layers:
   - **fable-intelligence** — pure API/model reference (verified facts, SDK code)
   - **fable-brain** — behavioral enhancement layer (decision-making, response quality, classifier-aware communication)
4. Built a full JavaScript library implementing the API patterns as reusable code

## What's in each file

### `/fable-intelligence` (SKILL.md — 429 lines)
- **7 models** with exact IDs, pricing, context windows, max output
- **Thinking & effort rules** per model — what works, what 400s, adaptive vs legacy, effort levels (low → xhigh → max), task budgets
- **SDK code** for every major feature — tool runner (Zod), streaming, structured output, prompt caching, compaction, batches, Files API, token counting
- **Server-side tools** — exact type strings (`web_search_20260209`, `code_execution_20260120`, `text_editor_20250728`, etc.)
- **Managed Agents** — full agent → session → events flow, environments, vaults, outcomes, multiagent, deployments, memory stores
- **Fable 5 deep reference** — refusal response shape (4 categories: `cyber`/`bio`/`frontier_llm`/`reasoning_extraction`), server-side fallback spec (exact header, sticky routing, billing, served-by detection), client-side middleware (`betaRefusalFallbackMiddleware` + `BetaFallbackState`), batch handling, pitfalls
- **Fable 5 vs Opus 4.8** comparison table

### `/fable-brain` (FABLE-BRAIN.md — behavioral layer)
- **Classifier-aware communication** — 10 general principles for avoiding false-positive content blocks across ALL domains (security, bio, chemistry, policy). No term tables — general rules that work for everything
- **Tone & voice** — Fable 5's refined interaction rules (warm, honest, max one question per response)
- **Formatting** — when to use prose vs structure vs files, list rules, formatting minimalism
- **Search heuristics** — complete decision tree for when to search vs answer from knowledge
- **Tool scaling** — 1 call for simple, 3-5 for comparisons, 5-10 for research, 10+ for phased workflows
- **Response quality** — self-correction patterns, evenhandedness, epistemological rigor
- **Wellbeing awareness** — behavioral rules without diagnostic overreach

### JavaScript Library (`src/lib/`)
- **anthropic-client.js** — Full API client with adaptive thinking, effort, streaming, tool loops, cost estimation, token counting, refusal handling, fallbacks, cache stats. All 7 models with pricing.
- **tool-builder.js** — Ergonomic tool definition + automatic execution
- **conversation.js** — Multi-turn state management + game state engine
- **multimodal.js** — Image/PDF/document attachment helpers
- **decision-engine.js** — Fable 5's search/scale/format heuristics as callable functions

## Interesting things I learned

- **Fable 5 and Mythos 5 are the same model.** Same weights, same architecture. Fable 5 has safety classifiers; Mythos 5 doesn't. Mythos 5 is invitation-only (Project Glasswing).
- **Fable 5 thinking can't be disabled.** `thinking: {type: "disabled"}` returns 400. On Opus 4.8 it's fine. Fable 5-only breaking change.
- **Opus 4.7 tokenizer uses ~30% more tokens** than pre-4.7 models for the same text. Fable 5 uses this tokenizer. Budget accordingly.
- **Refusals are HTTP 200, not errors.** Your monitoring will never see them. You need explicit refusal tracking.
- **`xhigh` effort is NOT the Claude Code default** — Opus 4.8 defaults to `high` on all surfaces.
- **Refusal categories are 4, not 2** — `cyber`, `bio`, `frontier_llm` (what the press release called "distillation"), and `reasoning_extraction`.
- **Server-side fallback header must be EXACTLY `server-side-fallback-2026-06-01`** — any other date string returns 400.
- **Fable 5 is currently federally suspended** (US export control directive). All other models unaffected.
- **Classifier-aware vocabulary matters** — professional terminology ("missing authorization check" not "auth bypass") avoids false-positive blocks on legitimate security/research work.

## Install

### Skills (pick one or both)

```bash
# API reference skill
mkdir -p .claude/skills/fable-intelligence
# Drop SKILL.md in there

# Behavioral layer
mkdir -p .claude/skills/fable-brain
# Drop FABLE-BRAIN.md as SKILL.md in there
```

Invoke with `/fable-intelligence` or `/fable-brain`. They auto-register on next Claude Code session.

### JavaScript library (optional)

```bash
# Copy src/lib/ into your project
npm init -y  # if no package.json
# Add "type": "module" to package.json
node src/example-app.js  # decision engine demo (no API key needed)
```

With API key: `ANTHROPIC_API_KEY=sk-... node src/example-app.js`

## File list

```
Skills:
  SKILL.md          — API reference (429 lines) → .claude/skills/fable-intelligence/
  FABLE-BRAIN.md    — Behavioral layer → .claude/skills/fable-brain/SKILL.md
  install.sh        — One-shot installer

Library:
  src/lib/index.js            — Barrel export
  src/lib/anthropic-client.js — API client (models, pricing, thinking, effort, fallbacks)
  src/lib/tool-builder.js     — Tool definition + execution
  src/lib/conversation.js     — Multi-turn + game state
  src/lib/multimodal.js       — Image/PDF helpers
  src/lib/decision-engine.js  — Search/scale/format heuristics

Demo:
  src/example-app.js          — Working demo (runs without API key)
```

**Link to files:** [GitHub link here]

---

*Built by extracting the Fable 5 production system prompt and cross-referencing against official Anthropic documentation. All model IDs, pricing, parameters, and SDK patterns verified. The behavioral layer is surgical — Fable 5's decision-making intelligence without the claude.ai environment-specific rules that would confuse Claude Code.*
