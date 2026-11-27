import {
  normalizeProviderUsage,
} from "./aiUsage.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("normalizes OpenAI-compatible token usage", () => {
  const usage = normalizeProviderUsage("openai", {
    usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
  }, "req_openai_123");

  assert(usage.inputTokens === 120, "input token count should be preserved");
  assert(usage.outputTokens === 45, "output token count should be preserved");
  assert(usage.totalTokens === 165, "provider total should be preserved");
  assert(usage.usageSource === "provider", "usage must be marked provider-reported");
  assert(usage.requestId === "req_openai_123", "provider request id should be retained");
});

Deno.test("normalizes Anthropic input and output token usage", () => {
  const usage = normalizeProviderUsage("anthropic", {
    usage: { input_tokens: 256, output_tokens: 64 },
  });

  assert(usage.inputTokens === 256, "Anthropic input tokens should be mapped");
  assert(usage.outputTokens === 64, "Anthropic output tokens should be mapped");
  assert(usage.totalTokens === 320, "missing total can be derived from reported counts");
  assert(usage.usageSource === "provider", "reported counts must be identified");
});

Deno.test("normalizes Gemini usage metadata", () => {
  const usage = normalizeProviderUsage("google", {
    usageMetadata: {
      promptTokenCount: 80,
      candidatesTokenCount: 20,
      totalTokenCount: 100,
    },
  });

  assert(usage.inputTokens === 80, "Gemini prompt token count should be mapped");
  assert(usage.outputTokens === 20, "Gemini candidate token count should be mapped");
  assert(usage.totalTokens === 100, "Gemini total token count should be mapped");
});

Deno.test("does not fabricate usage when provider omits token metadata", () => {
  const usage = normalizeProviderUsage("openai", { choices: [] });

  assert(usage.inputTokens === null, "missing input usage should remain unknown");
  assert(usage.outputTokens === null, "missing output usage should remain unknown");
  assert(usage.totalTokens === null, "missing total usage should remain unknown");
  assert(usage.usageSource === "unavailable", "missing usage source should be explicit");
});

Deno.test("rejects malformed, negative and unsafe token values", () => {
  const usage = normalizeProviderUsage("openai", {
    usage: {
      prompt_tokens: -1,
      completion_tokens: "25",
      total_tokens: Number.MAX_SAFE_INTEGER + 1,
    },
  });

  assert(usage.inputTokens === null, "negative counts should be discarded");
  assert(usage.outputTokens === null, "string counts should not be coerced");
  assert(usage.totalTokens === null, "unsafe integer counts should be discarded");
  assert(usage.usageSource === "unavailable", "invalid counts are not valid provider usage");
});

Deno.test("sanitizes and bounds provider request references", () => {
  const raw = `  req-123\n${"x".repeat(200)}  `;
  const usage = normalizeProviderUsage("openai", {}, raw);

  assert(usage.requestId?.startsWith("req-123"), "request reference should be trimmed");
  assert(!usage.requestId?.includes("\n"), "control characters should be removed");
  assert(usage.requestId?.length === 128, "request reference should be bounded");
});
