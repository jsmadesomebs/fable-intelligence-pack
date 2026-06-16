/**
 * Decision Engine — Fable 5 heuristics codified.
 * Classifies queries and recommends tool strategies.
 */

const SEARCH_SIGNALS = ["current", "still", "latest", "now", "today", "recent", "new", "price", "score"];
const SKIP_SIGNALS = ["how to", "what is", "define", "explain", "syntax", "formula", "theorem"];

const CHANGEABLE_DOMAINS = [
  "politics", "government", "ceo", "president", "chairman", "director",
  "price", "stock", "weather", "score", "ranking", "standings",
  "policy", "law", "regulation", "rate", "exchange",
];

const TIMELESS_DOMAINS = [
  "math", "physics", "chemistry", "history", "geography", "definition",
  "algorithm", "data structure", "programming syntax", "protocol",
];

function classifyQuery(query) {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);

  const result = {
    shouldSearch: false,
    searchReason: null,
    toolScale: 1,
    outputFormat: "inline",
    complexity: "simple",
  };

  if (SEARCH_SIGNALS.some(s => lower.includes(s))) {
    result.shouldSearch = true;
    result.searchReason = "contains temporal signal word";
  }

  if (CHANGEABLE_DOMAINS.some(d => lower.includes(d))) {
    result.shouldSearch = true;
    result.searchReason = "topic in changeable domain";
  }

  if (TIMELESS_DOMAINS.some(d => lower.includes(d)) && !result.shouldSearch) {
    result.shouldSearch = false;
    result.searchReason = "timeless domain — answer from knowledge";
  }

  if (lower.includes("compare") || lower.includes(" vs ") || lower.includes("versus")) {
    result.toolScale = Math.max(result.toolScale, 3);
    result.complexity = "medium";
  }

  if (lower.includes("research") || lower.includes("comprehensive") || lower.includes("analysis") || lower.includes("audit")) {
    result.toolScale = Math.max(result.toolScale, 5);
    result.complexity = "complex";
  }

  if (lower.includes("thorough") || lower.includes("exhaustive") || lower.includes("deep dive")) {
    result.toolScale = Math.max(result.toolScale, 8);
    result.complexity = "complex";
  }

  result.outputFormat = classifyOutputFormat(lower);

  return result;
}

function classifyOutputFormat(query) {
  const fileSignals = [
    "write a post", "blog post", "article", "story", "essay",
    "draft a", "create a component", "build a", "script",
    "presentation", "document", "report", "template",
  ];
  const inlineSignals = [
    "summarize", "explain", "what is", "how does", "strategy",
    "outline", "plan", "opinion", "think about", "analyze",
  ];

  if (fileSignals.some(s => query.includes(s))) return "file";
  if (inlineSignals.some(s => query.includes(s))) return "inline";
  return "inline";
}

function shouldSearchEntity(entityName) {
  const lower = entityName.toLowerCase();
  const knownDeceased = ["george washington", "albert einstein", "napoleon"];
  if (knownDeceased.some(d => lower.includes(d))) return false;

  const capitalWords = entityName.match(/[A-Z][a-z]+/g) || [];
  if (capitalWords.length >= 2) return true;

  return false;
}

function scaleTools(query, context = {}) {
  const classification = classifyQuery(query);
  let scale = classification.toolScale;

  if (context.sourceCount) {
    scale = Math.max(scale, Math.min(context.sourceCount, 10));
  }

  if (context.isComparison) scale = Math.max(scale, 3);
  if (context.needsInternal && context.needsExternal) scale = Math.max(scale, 5);

  return {
    recommended: scale,
    min: Math.max(1, Math.floor(scale * 0.6)),
    max: Math.min(15, Math.ceil(scale * 1.5)),
    usePhasedApproach: scale > 10,
  };
}

function formatResponse(query) {
  const classification = classifyQuery(query);

  return {
    format: classification.outputFormat,
    useLists: false,
    useHeaders: classification.complexity === "complex",
    maxQuotesPerSource: 1,
    maxQuoteLength: 15,
    prose: classification.complexity !== "complex",
  };
}

export {
  classifyQuery,
  classifyOutputFormat,
  shouldSearchEntity,
  scaleTools,
  formatResponse,
  SEARCH_SIGNALS,
  SKIP_SIGNALS,
  CHANGEABLE_DOMAINS,
  TIMELESS_DOMAINS,
};
