/**
 * Anthropic API Client — verified against official docs (June 2026).
 * Drop-in helper for building Claude-powered apps.
 */

const MODELS = {
  FABLE_5: "claude-fable-5",
  MYTHOS_5: "claude-mythos-5",
  OPUS_4_8: "claude-opus-4-8",
  OPUS_4_7: "claude-opus-4-7",
  OPUS_4_6: "claude-opus-4-6",
  SONNET_4_6: "claude-sonnet-4-6",
  HAIKU_4_5: "claude-haiku-4-5",
};

const PRICING = {
  [MODELS.FABLE_5]:  { input: 10.00, output: 50.00, context: 1_000_000, maxOutput: 128_000 },
  [MODELS.MYTHOS_5]: { input: 10.00, output: 50.00, context: 1_000_000, maxOutput: 128_000 },
  [MODELS.OPUS_4_8]: { input: 5.00,  output: 25.00, context: 1_000_000, maxOutput: 128_000 },
  [MODELS.OPUS_4_7]: { input: 5.00,  output: 25.00, context: 1_000_000, maxOutput: 128_000 },
  [MODELS.OPUS_4_6]: { input: 5.00,  output: 25.00, context: 1_000_000, maxOutput: 128_000 },
  [MODELS.SONNET_4_6]: { input: 3.00, output: 15.00, context: 1_000_000, maxOutput: 64_000 },
  [MODELS.HAIKU_4_5]:  { input: 1.00, output: 5.00,  context: 200_000,   maxOutput: 64_000 },
};

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];

const DEFAULT_MODEL = MODELS.OPUS_4_8;
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

class AnthropicClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || DEFAULT_MODEL;
    this.maxTokens = options.maxTokens || 16000;
    this.baseHeaders = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    };
  }

  async message(messages, options = {}) {
    const model = options.model || this.model;
    const body = {
      model,
      max_tokens: options.maxTokens || this.maxTokens,
      messages: Array.isArray(messages) ? messages : [{ role: "user", content: messages }],
    };

    if (options.system) body.system = options.system;
    if (options.tools?.length) body.tools = options.tools;
    if (options.stream) body.stream = true;

    if (options.thinking !== undefined) {
      body.thinking = options.thinking;
    } else if (this._supportsAdaptiveThinking(model)) {
      body.thinking = { type: "adaptive" };
    }

    if (options.effort) {
      body.output_config = { ...body.output_config, effort: options.effort };
    }
    if (options.outputFormat) {
      body.output_config = { ...body.output_config, format: options.outputFormat };
    }
    if (options.cacheControl) {
      body.cache_control = options.cacheControl;
    }

    const headers = { ...this.baseHeaders };
    if (options.betas?.length) {
      headers["anthropic-beta"] = options.betas.join(",");
    }

    if (options.fallbacks) {
      body.fallbacks = options.fallbacks;
      headers["anthropic-beta"] = (headers["anthropic-beta"] || "") +
        (headers["anthropic-beta"] ? "," : "") + "server-side-fallback-2026-06-01";
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AnthropicError(res.status, err);
    }

    if (options.stream) return this._handleStream(res);
    return new MessageResponse(await res.json());
  }

  async text(prompt, options = {}) {
    const response = await this.message(prompt, options);
    return response.text;
  }

  async json(prompt, options = {}) {
    const system = (options.system || "") +
      "\nReturn ONLY valid JSON. No preamble, no markdown fences, no explanation.";
    const response = await this.message(prompt, { ...options, system: system.trim() });
    return response.parseJson();
  }

  async toolLoop(messages, tools, executor, options = {}) {
    let msgs = Array.isArray(messages) ? [...messages] : [{ role: "user", content: messages }];
    const maxRounds = options.maxRounds || 10;

    for (let round = 0; round < maxRounds; round++) {
      const response = await this.message(msgs, { ...options, tools });

      if (response.stopReason === "end_turn") return response;
      if (!response.hasToolUse && response.stopReason !== "pause_turn") return response;

      msgs.push({ role: "assistant", content: response.raw.content });

      if (response.stopReason === "pause_turn") continue;

      const toolResults = [];
      for (const call of response.toolCalls) {
        const result = await executor(call.name, call.input, call.id);
        toolResults.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }
      msgs.push({ role: "user", content: toolResults });
    }

    throw new Error(`Tool loop exceeded ${maxRounds} rounds`);
  }

  async countTokens(messages, options = {}) {
    const res = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
      method: "POST",
      headers: this.baseHeaders,
      body: JSON.stringify({
        model: options.model || this.model,
        messages: Array.isArray(messages) ? messages : [{ role: "user", content: messages }],
      }),
    });
    const data = await res.json();
    return data.input_tokens;
  }

  async *_handleStream(res) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try { yield JSON.parse(data); } catch { /* skip malformed */ }
        }
      }
    }
  }

  _supportsAdaptiveThinking(model) {
    return model.includes("opus") || model.includes("sonnet-4") || model.includes("fable");
  }

  estimateCost(inputTokens, outputTokens, model) {
    const m = model || this.model;
    const p = PRICING[m];
    if (!p) return null;
    return {
      input: (inputTokens / 1_000_000) * p.input,
      output: (outputTokens / 1_000_000) * p.output,
      total: (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output,
    };
  }

  static serverTools = {
    webSearch: { type: "web_search_20260209", name: "web_search" },
    webFetch: { type: "web_fetch_20260209", name: "web_fetch" },
    codeExecution: { type: "code_execution_20260120", name: "code_execution" },
    textEditor: { type: "text_editor_20250728", name: "str_replace_based_edit_tool" },
    bash: { type: "bash_20250124", name: "bash" },
  };
}

class MessageResponse {
  constructor(raw) {
    this.raw = raw;
  }

  get text() {
    return this.raw.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
  }

  get thinking() {
    return this.raw.content
      .filter(b => b.type === "thinking")
      .map(b => b.thinking)
      .join("");
  }

  get toolCalls() {
    return this.raw.content
      .filter(b => b.type === "tool_use")
      .map(b => ({ id: b.id, name: b.name, input: b.input }));
  }

  get hasToolUse() {
    return this.raw.content.some(b => b.type === "tool_use");
  }

  get stopReason() {
    return this.raw.stop_reason;
  }

  get isRefusal() {
    return this.raw.stop_reason === "refusal";
  }

  get stopDetails() {
    return this.raw.stop_details || null;
  }

  get usage() {
    return this.raw.usage;
  }

  get model() {
    return this.raw.model;
  }

  get cacheStats() {
    const u = this.raw.usage;
    return {
      created: u.cache_creation_input_tokens || 0,
      read: u.cache_read_input_tokens || 0,
      uncached: u.input_tokens || 0,
      total: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
    };
  }

  parseJson() {
    const clean = this.text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
}

class AnthropicError extends Error {
  constructor(status, body) {
    super(`Anthropic API ${status}: ${body?.error?.message || "Unknown error"}`);
    this.status = status;
    this.body = body;
    this.errorType = body?.error?.type || null;
    this.isRateLimit = status === 429;
    this.isOverloaded = status === 529;
    this.isAuth = status === 401;
    this.isBadRequest = status === 400;
  }
}

export {
  AnthropicClient,
  MessageResponse,
  AnthropicError,
  MODELS,
  PRICING,
  EFFORT_LEVELS,
  DEFAULT_MODEL,
};
