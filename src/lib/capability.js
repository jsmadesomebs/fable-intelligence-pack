/**
 * Capability layer — get a general-purpose agent as close to Fable-5-grade
 * behavior as the API allows on whatever model you run: direct levers where
 * they exist, workarounds where they don't.
 *
 *   pickModel          — route by domain. Fable 5 is more capable, but routes
 *                        cyber/bio to an Opus 4.8 fallback and can refuse benign
 *                        security work, so send those straight to Opus 4.8.
 *   maxCapability      — high-capability options bundle (effort, adaptive
 *                        thinking, task budget) to spread into a call.
 *   FABLE_GRADE_SYSTEM — distilled Fable-5 prompting heuristics as a reusable
 *                        system prompt (act-when-ready, ground-progress, scope
 *                        boundaries, readable summaries, no reasoning reproduction).
 */

import { MODELS } from "./anthropic-client.js";

// Domains where Fable 5 routes to an Opus 4.8 fallback (and benign work can be
// refused), so calling Opus directly is strictly better — same model, no refusal.
const OPUS_FALLBACK_DOMAINS = ["security", "cyber", "malware", "exploit", "intrusion", "bio", "chem"];

function pickModel({ domain } = {}) {
  if (domain && OPUS_FALLBACK_DOMAINS.some(d => domain.toLowerCase().includes(d))) {
    return MODELS.OPUS_4_8;
  }
  return MODELS.FABLE_5;
}

function maxCapability(overrides = {}) {
  return {
    // xhigh = highest on Opus 4.7+/Fable; use "max" for correctness-over-cost.
    effort: "xhigh",
    thinking: { type: "adaptive", display: "summarized" },
    maxTokens: 64000,
    taskBudget: { type: "tokens", total: 128000 },
    ...overrides,
  };
}

// Distilled from the official "Prompting Claude Fable 5" guide. Reusable as-is.
const FABLE_GRADE_SYSTEM = `When you have enough information to act, act. Don't re-derive established facts, re-litigate settled decisions, or narrate options you won't pursue. If weighing a choice, give a recommendation, not a survey.

Before reporting progress, audit each claim against a tool result from this session. Report only work you can point to evidence for; if something isn't verified, say so. If tests fail, say so with the output; if a step was skipped, say that.

When the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment — report findings and stop. Don't apply a fix until asked. Before a state-changing action, confirm the evidence supports that specific action.

Pause for the user only when the work genuinely requires it: a destructive or irreversible action, a real scope change, or input only they can provide. Otherwise proceed.

Lead with the outcome: your first sentence answers "what happened" or "what did you find." Supporting detail after. In final summaries drop working shorthand — complete sentences, spelled-out terms, no arrow chains; give each file or identifier its own plain clause.

Do not reproduce, transcribe, or explain your internal reasoning in the response text.`;

export { pickModel, maxCapability, FABLE_GRADE_SYSTEM, OPUS_FALLBACK_DOMAINS };
