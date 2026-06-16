/**
 * Conversation Manager — stateful multi-turn + tool loop handling.
 * Claude has no memory between calls, so this manages full context.
 */

class Conversation {
  constructor(client, options = {}) {
    this.client = client;
    this.system = options.system || "";
    this.tools = options.tools || [];
    this.executor = options.executor || null;
    this.history = [];
    this.metadata = {};
  }

  async send(content) {
    this.history.push({ role: "user", content });

    const options = { system: this.system || undefined };

    if (this.tools.length && this.executor) {
      const response = await this.client.toolLoop(
        this.history,
        this.tools,
        this.executor,
        options
      );
      this.history.push({ role: "assistant", content: response.raw.content });
      return response;
    }

    const response = await this.client.message(this.history, options);
    this.history.push({ role: "assistant", content: response.raw.content });
    return response;
  }

  async text(content) {
    const response = await this.send(content);
    return response.text;
  }

  inject(role, content) {
    this.history.push({ role, content });
    return this;
  }

  reset() {
    this.history = [];
    return this;
  }

  fork() {
    const copy = new Conversation(this.client, {
      system: this.system,
      tools: this.tools,
      executor: this.executor,
    });
    copy.history = [...this.history];
    return copy;
  }

  get turns() {
    return this.history.length;
  }

  get lastResponse() {
    const last = this.history.findLast(m => m.role === "assistant");
    if (!last) return null;
    if (typeof last.content === "string") return last.content;
    return last.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
  }

  toMessages() {
    return [...this.history];
  }
}

class GameState {
  constructor(client, initialState = {}) {
    this.client = client;
    this.state = initialState;
    this.actionHistory = [];
  }

  async act(action, systemPrompt) {
    this.actionHistory.push(action);

    const prompt = `Given this state: ${JSON.stringify(this.state)}
Last action: "${action}"
Action history: ${JSON.stringify(this.actionHistory.slice(-5))}
Respond ONLY with a JSON object containing:
- updatedState (the new game state)
- actionResult (what happened)
- availableActions (array of what the player can do next)`;

    const response = await this.client.json(prompt, { system: systemPrompt });
    this.state = response.updatedState || this.state;
    return response;
  }

  getState() {
    return { ...this.state };
  }

  reset(newState = {}) {
    this.state = newState;
    this.actionHistory = [];
  }
}

export { Conversation, GameState };
