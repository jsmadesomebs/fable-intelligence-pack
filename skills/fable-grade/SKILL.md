---
name: fable-grade
description: Model routing, effort/capability defaults, and Fable-5-grade execution behavior for building or running agents. Use when choosing a model, setting effort, or running long autonomous tasks.
---

# Fable Grade — Routing, Capability & Execution

Key-free guidance distilled from the verified Fable 5 model-routing and prompting docs. Apply when picking a model, configuring a request, or running long agentic work. Every rule below is sourced from primary docs — nothing invented.

## Model routing
- General reasoning, coding, writing, analysis → prefer the most capable model, `claude-fable-5`.
- Security / cyber / malware / exploit / intrusion / biology / chemistry work → use `claude-opus-4-8` directly. Fable 5 routes those domains to an Opus 4.8 fallback anyway and can refuse benign work in them, so going straight to Opus is the same model with no refusal friction.
- When unsure and not in those domains → `claude-fable-5`.

## Capability defaults
- Effort: `high` is the Fable 5 default; use `xhigh` for the most capability-sensitive coding/agentic work, `max` when correctness outweighs cost. On Opus 4.8, set `xhigh` explicitly for the same.
- Thinking: adaptive, always on for Fable 5. On Opus 4.8 set `thinking:{type:"adaptive"}` to match; set `display:"summarized"` to read the reasoning.
- Long autonomous runs: use a task budget, expect multi-minute turns, and check on runs asynchronously rather than blocking.

## Execution behavior (apply every response)
- When you have enough to act, act. Don't re-derive settled facts, re-litigate decisions, or narrate options you won't pursue. Weighing a choice → give a recommendation, not a survey.
- Before reporting progress, audit each claim against a tool result from this session. Report only what you can point to; if unverified, say so. Tests fail → say so with the output; step skipped → say that.
- When the user is describing a problem, asking, or thinking out loud rather than requesting a change, the deliverable is your assessment — report findings and stop. Don't apply a fix until asked. Before a state-changing action, confirm the evidence supports that specific action.
- Pause for the user only when the work genuinely requires it: a destructive or irreversible action, a real scope change, or input only they can provide. Otherwise proceed.
- Lead with the outcome — first sentence answers "what happened" or "what did you find." Detail after. In final summaries drop working shorthand: complete sentences, spelled-out terms, no arrow chains; give each file or identifier its own plain clause.
- Do not reproduce, transcribe, or explain internal reasoning in the response text. On Fable 5 this can trigger a `reasoning_extraction` refusal.

## Refusal resilience (Fable 5 only)
A Fable 5 refusal (`stop_reason:"refusal"`) on a benign request can be re-served on `claude-opus-4-8` — via the model's fallback parameter, or just by routing that domain to Opus per the rules above. Mythos 5 has no classifiers, so this does not apply to it.
