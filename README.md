# Fable Intelligence + Fable Brain — Drop-in Claude Code Skills & Library

**Extracted from the actual Fable 5 system prompt + verified against official Anthropic docs (June 2026).**

Two skills that make any Claude Code instance significantly smarter, plus a JavaScript library for building Claude-powered apps.

## What's Here

| File | What It Does | Where It Goes |
|------|-------------|---------------|
| `SKILL.md` | Complete API reference — models, pricing, SDK patterns, managed agents, refusal handling | `.claude/skills/fable-intelligence/SKILL.md` |
| `FABLE-BRAIN.md` | Behavioral intelligence — response quality, search heuristics, formatting, classifier-aware communication | `.claude/skills/fable-brain/SKILL.md` |
| `src/lib/` | JavaScript library — API client, tool builder, conversation manager, decision engine | Your project's `src/lib/` |
| `install.sh` | One-shot installer for both skills | Run from project root |

## Quick Setup

### Option 1: Install script
```bash
bash install.sh
```

### Option 2: Manual
```bash
mkdir -p .claude/skills/fable-intelligence
mkdir -p .claude/skills/fable-brain
cp SKILL.md .claude/skills/fable-intelligence/SKILL.md
cp FABLE-BRAIN.md .claude/skills/fable-brain/SKILL.md
```

### Option 3: Just one skill
Pick whichever you need:
- `/fable-intelligence` — for building apps with the Claude API
- `/fable-brain` — for better responses across everything

## The Two Skills

### fable-intelligence (API Reference)
Everything Claude needs to write correct Claude API code:
- 7 models with exact IDs and pricing
- Thinking/effort rules per model (what 400s, what works)
- TypeScript SDK patterns for every feature
- Server-side tool type strings
- Prompt caching rules + silent invalidator checklist
- Managed Agents full lifecycle
- Fable 5 refusal handling (4 categories, fallback spec, billing)
- Batch API, Files API, token counting, compaction

### fable-brain (Behavioral Layer)
Fable 5's refined decision-making, stripped of claude.ai-specific environment rules:
- **Classifier-aware communication** — 10 principles for avoiding false-positive content blocks in security, research, bio, chemistry, policy work
- **Search decision tree** — when to search vs answer from knowledge
- **Tool scaling** — how many tool calls based on query complexity
- **Response formatting** — prose by default, structure only when needed, file vs inline
- **Tone calibration** — warm, honest, max one question per response
- **Self-correction** — own mistakes without self-abasement
- **Epistemological rigor** — good sourcing, skepticism of SEO content

## JavaScript Library

Drop `src/lib/` into your project. ES modules, zero dependencies.

```javascript
import { AnthropicClient, MODELS, PRICING, classifyQuery } from "./lib/index.js";

// API client with all modern features
const client = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
const answer = await client.text("Hello");

// Structured JSON output
const data = await client.json("List 3 languages with name and year");

// Automatic tool loop
const result = await client.toolLoop("What's the weather?", tools, executor);

// Cost estimation
const cost = client.estimateCost(1000, 500, MODELS.OPUS_4_8);

// Decision engine (no API key needed)
const decision = classifyQuery("Who is the current CEO of OpenAI?");
// { shouldSearch: true, toolScale: 1, outputFormat: "inline" }
```

## Source

1. Claude Fable 5 production system prompt (1,600 lines from claude.ai)
2. Official Anthropic `claude-api` documentation (platform.claude.com)
3. Cross-verified for accuracy — all model IDs, pricing, and parameters confirmed

## License

Do whatever you want with it.
