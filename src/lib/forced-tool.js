/**
 * Forced tool use harness.
 *
 * Forced tool use (`tool_choice: {type:"any"|"tool"}`) is incompatible with
 * extended thinking. Fable 5 / Mythos 5 have always-on thinking that cannot be
 * disabled, so a forced-tool request on those models returns a 400. This module
 * reconstructs the *behavior* without ever sending an illegal request:
 *
 *   1. Native path — model can force directly (thinking off): send tool_choice.
 *   2. Coax path   — always-thinking model: single strict tool + tool_choice
 *                    auto + a hard instruction; inspect the response, retry with
 *                    escalation if the tool wasn't called.
 *   3. Relay path  — last resort: delegate the forced call to a model where
 *                    forcing is legal (default Opus 4.8 with thinking disabled).
 *
 * Returns { toolUse, servedByRelay, attempts, response }.
 */

const ALWAYS_THINKING = ["fable", "mythos"];

function isAlwaysThinking(model) {
  return ALWAYS_THINKING.some(m => model.includes(m));
}

function findToolUse(response, toolName) {
  return response.toolCalls.find(c => c.name === toolName) || null;
}

// Thinking/redacted_thinking blocks carry signatures that are only valid on the
// model that produced them. Strip them before handing context to a DIFFERENT
// model (the relay), or the request 400s on signature mismatch.
function stripThinking(messages) {
  return messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.filter(
        b => b.type !== "thinking" && b.type !== "redacted_thinking"
      ),
    };
  });
}

async function forceTool(client, messages, tool, options = {}) {
  const {
    model = client.model,
    relayModel = "claude-opus-4-8",
    maxRetries = 2,
    system,
    effort,
  } = options;

  const msgs = Array.isArray(messages)
    ? [...messages]
    : [{ role: "user", content: messages }];

  const toolName = tool.name;
  // Default to strict so a forced call is also schema-valid.
  const forcedTool = { ...tool, strict: tool.strict ?? true };

  // 1. Native path — forcing requires thinking off, so this is only legal on a
  // model whose thinking can be disabled (everything except Fable/Mythos).
  if (!isAlwaysThinking(model)) {
    const response = await client.message(msgs, {
      model,
      system,
      effort,
      tools: [forcedTool],
      toolChoice: { type: "tool", name: toolName },
      thinking: { type: "disabled" },
    });
    const toolUse = findToolUse(response, toolName);
    if (toolUse) return { toolUse, servedByRelay: false, attempts: 1, response };
    // Unexpected miss — drop through to the relay.
  } else {
    // 2. Coax path — always-thinking model. tool_choice any/tool would 400, so
    // use auto + a hard instruction and verify the model actually complied.
    const instruction =
      `You must call the \`${toolName}\` tool to proceed. ` +
      `Respond with the tool call only — no preamble.`;
    const coaxSystem = [system, instruction].filter(Boolean).join("\n\n");
    const working = [...msgs];

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const response = await client.message(working, {
        model,
        system: coaxSystem,
        effort,
        tools: [forcedTool],
        toolChoice: { type: "auto" },
      });
      const toolUse = findToolUse(response, toolName);
      if (toolUse) {
        return { toolUse, servedByRelay: false, attempts: attempt, response };
      }
      // Preserve the assistant turn unchanged (thinking blocks included — same
      // model, so signatures stay valid), then escalate.
      working.push({ role: "assistant", content: response.raw.content });
      working.push({
        role: "user",
        content: `That response did not call \`${toolName}\`. Call it now — tool call only, no prose.`,
      });
    }
  }

  // 3. Relay path — forcing is legal on the relay model with thinking disabled.
  const relayMsgs = stripThinking(msgs);
  const response = await client.message(relayMsgs, {
    model: relayModel,
    system,
    effort,
    tools: [forcedTool],
    toolChoice: { type: "tool", name: toolName },
    thinking: { type: "disabled" },
  });
  const toolUse = findToolUse(response, toolName);
  if (!toolUse) {
    throw new Error(
      `forceTool: relay model ${relayModel} did not return a '${toolName}' tool call`
    );
  }
  return { toolUse, servedByRelay: true, attempts: maxRetries + 2, response };
}

export { forceTool, isAlwaysThinking };
