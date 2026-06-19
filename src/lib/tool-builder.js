/**
 * Tool Builder — ergonomic tool definition + execution for Anthropic API.
 * Extracted from Fable 5's tool use patterns.
 */

class ToolBuilder {
  constructor() {
    this.tools = [];
    this.executors = new Map();
  }

  add(name, description, schema, handler, options = {}) {
    const required = Object.entries(schema)
      .filter(([_, v]) => !v.optional)
      .map(([k]) => k);

    const properties = {};
    for (const [key, val] of Object.entries(schema)) {
      const { optional, ...rest } = val;
      properties[key] = rest;
    }

    const tool = {
      name,
      description,
      input_schema: {
        type: "object",
        properties,
        required,
      },
    };
    // strict: true guarantees tool inputs conform to the schema (constrained
    // decoding). Pairs with forced tool use for guaranteed + valid calls.
    if (options.strict) tool.strict = true;
    // defer_loading keeps the tool out of the prompt until tool search finds it
    // (preserves prompt cache; lets you scale to large tool catalogs).
    if (options.defer) tool.defer_loading = true;
    this.tools.push(tool);

    if (handler) this.executors.set(name, handler);
    return this;
  }

  addWebSearch() {
    this.tools.push({
      type: "web_search_20260209",
      name: "web_search",
    });
    return this;
  }

  // Pair a faster executor with a higher-IQ advisor consulted mid-generation.
  // Requires the beta header "advisor-tool-2026-03-01" on the request.
  addAdvisor(advisorModel = "claude-opus-4-8") {
    this.tools.push({ type: "advisor_20260301", name: "advisor", model: advisorModel });
    return this;
  }

  // Lazy-load a large tool catalog. Mark deferred tools with { defer: true } on add().
  addToolSearch(variant = "regex") {
    const type = variant === "bm25"
      ? "tool_search_tool_bm25_20251119"
      : "tool_search_tool_regex_20251119";
    this.tools.push({ type, name: type.replace(/_\d+$/, "") });
    return this;
  }

  getTools() {
    return this.tools;
  }

  async execute(name, input) {
    const handler = this.executors.get(name);
    if (!handler) throw new Error(`No handler for tool: ${name}`);
    return handler(input);
  }

  createExecutor() {
    return (name, input) => this.execute(name, input);
  }
}

function defineTool(name, description, params, options = {}) {
  const required = [];
  const properties = {};

  for (const [key, config] of Object.entries(params)) {
    const { required: isRequired = true, ...schema } = config;
    properties[key] = schema;
    if (isRequired) required.push(key);
  }

  const tool = {
    name,
    description,
    input_schema: { type: "object", properties, required },
  };
  if (options.strict) tool.strict = true;
  return tool;
}

function defineEnum(name, description, paramName, values) {
  return defineTool(name, description, {
    [paramName]: { type: "string", enum: values, description: `One of: ${values.join(", ")}` },
  });
}

const COMMON_TOOLS = {
  webSearch: { type: "web_search_20260209", name: "web_search" },

  calculator: defineTool("calculator", "Evaluate a math expression", {
    expression: { type: "string", description: "Math expression to evaluate" },
  }),

  getCurrentTime: defineTool("get_current_time", "Get current date and time", {
    timezone: { type: "string", description: "IANA timezone", required: false },
  }),
};

export { ToolBuilder, defineTool, defineEnum, COMMON_TOOLS };
