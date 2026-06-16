/**
 * Example: AI-powered CLI app using Fable Intelligence library.
 * Demonstrates tool use, conversation management, and decision heuristics.
 *
 * Run: node --experimental-modules src/example-app.js
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { AnthropicClient, MODELS, ToolBuilder, Conversation, classifyQuery } from "./lib/index.js";

const client = new AnthropicClient(process.env.ANTHROPIC_API_KEY, {
  model: MODELS.SONNET_4_6,
});

// --- Example 1: Simple text completion ---
async function simpleChat() {
  const answer = await client.text("Explain recursion in one sentence.");
  console.log("Simple:", answer);
}

// --- Example 2: Structured JSON output ---
async function structuredOutput() {
  const data = await client.json(
    "List 3 programming languages. Each with: name, year, paradigm."
  );
  console.log("Structured:", data);
}

// --- Example 3: Tool use with automatic loop ---
async function toolUseExample() {
  const tools = new ToolBuilder();

  tools.add("get_weather", "Get weather for a city", {
    city: { type: "string", description: "City name" },
  }, async ({ city }) => {
    return { city, temp: 72, condition: "sunny" };
  });

  tools.add("get_time", "Get current time in a timezone", {
    timezone: { type: "string", description: "IANA timezone" },
  }, async ({ timezone }) => {
    return { timezone, time: new Date().toLocaleString("en-US", { timeZone: timezone }) };
  });

  const response = await client.toolLoop(
    "What's the weather in Tokyo and what time is it there?",
    tools.getTools(),
    tools.createExecutor()
  );
  console.log("Tool use:", response.text);
}

// --- Example 4: Multi-turn conversation ---
async function conversationExample() {
  const convo = new Conversation(client, {
    system: "You are a concise coding tutor. Max 2 sentences per response.",
  });

  console.log("Turn 1:", await convo.text("What is a closure?"));
  console.log("Turn 2:", await convo.text("Give me a JavaScript example."));
  console.log("Turn 3:", await convo.text("How is that different from a regular function?"));
}

// --- Example 5: Decision engine ---
function decisionDemo() {
  const queries = [
    "Who is the current CEO of OpenAI?",
    "What is the Pythagorean theorem?",
    "Compare React vs Vue vs Svelte for a new project",
    "Write a comprehensive research report on quantum computing",
    "What's the price of Bitcoin?",
  ];

  for (const q of queries) {
    const result = classifyQuery(q);
    console.log(`\nQuery: "${q}"`);
    console.log(`  Search: ${result.shouldSearch} (${result.searchReason || "default"})`);
    console.log(`  Scale: ${result.toolScale} tools`);
    console.log(`  Format: ${result.outputFormat}`);
    console.log(`  Complexity: ${result.complexity}`);
  }
}

// Run demos
console.log("=== Decision Engine Demo (no API key needed) ===\n");
decisionDemo();

if (process.env.ANTHROPIC_API_KEY) {
  console.log("\n\n=== API Demos ===\n");
  await simpleChat();
  await structuredOutput();
  await toolUseExample();
  await conversationExample();
} else {
  console.log("\n\nSet ANTHROPIC_API_KEY to run API demos.");
}
