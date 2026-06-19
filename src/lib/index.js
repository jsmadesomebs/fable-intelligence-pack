/**
 * Fable Intelligence Library
 * Anthropic API patterns + decision heuristics extracted from Fable 5.
 *
 * Usage:
 *   import { AnthropicClient, MODELS, ToolBuilder, classifyQuery } from "./lib/index.js";
 *
 *   const client = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
 *   const answer = await client.text("What is the meaning of life?");
 */

export { AnthropicClient, MessageResponse, AnthropicError, MODELS, PRICING, EFFORT_LEVELS, DEFAULT_MODEL } from "./anthropic-client.js";
export { ToolBuilder, defineTool, defineEnum, COMMON_TOOLS } from "./tool-builder.js";
export { Conversation, GameState } from "./conversation.js";
export { forceTool, isAlwaysThinking } from "./forced-tool.js";
export { pickModel, maxCapability, FABLE_GRADE_SYSTEM, OPUS_FALLBACK_DOMAINS } from "./capability.js";
export { fileToBase64, detectMediaType, imageBlock, documentBlock, imageUrl, buildMultimodalMessage } from "./multimodal.js";
export { classifyQuery, classifyOutputFormat, shouldSearchEntity, scaleTools, formatResponse } from "./decision-engine.js";
