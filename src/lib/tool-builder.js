/**
 * Tool Builder — ergonomic tool definition + execution for Anthropic API.
 * Extracted from Fable 5's tool use patterns.
 */

class ToolBuilder {
  constructor() {
    this.tools = [];
    this.executors = new Map();
  }

  add(name, description, schema, handler) {
    const required = Object.entries(schema)
      .filter(([_, v]) => !v.optional)
      .map(([k]) => k);

    const properties = {};
    for (const [key, val] of Object.entries(schema)) {
      const { optional, ...rest } = val;
      properties[key] = rest;
    }

    this.tools.push({
      name,
      description,
      input_schema: {
        type: "object",
        properties,
        required,
      },
    });

    if (handler) this.executors.set(name, handler);
    return this;
  }

  addWebSearch() {
    this.tools.push({
      type: "web_search_20250305",
      name: "web_search",
    });
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

function defineTool(name, description, params) {
  const required = [];
  const properties = {};

  for (const [key, config] of Object.entries(params)) {
    const { required: isRequired = true, ...schema } = config;
    properties[key] = schema;
    if (isRequired) required.push(key);
  }

  return {
    name,
    description,
    input_schema: { type: "object", properties, required },
  };
}

function defineEnum(name, description, paramName, values) {
  return defineTool(name, description, {
    [paramName]: { type: "string", enum: values, description: `One of: ${values.join(", ")}` },
  });
}

const COMMON_TOOLS = {
  webSearch: { type: "web_search_20250305", name: "web_search" },

  calculator: defineTool("calculator", "Evaluate a math expression", {
    expression: { type: "string", description: "Math expression to evaluate" },
  }),

  getCurrentTime: defineTool("get_current_time", "Get current date and time", {
    timezone: { type: "string", description: "IANA timezone", required: false },
  }),
};

export { ToolBuilder, defineTool, defineEnum, COMMON_TOOLS };
