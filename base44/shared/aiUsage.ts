export type UsageSource = "provider" | "unavailable";

export type NormalizedModelUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  usageSource: UsageSource;
  requestId: string | null;
};

function tokenCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function requestReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  return normalized ? normalized.slice(0, 128) : null;
}

/**
 * Normalize token counts reported in provider responses.
 *
 * This function never estimates token usage. Missing, malformed, negative or
 * unsafe integer values become null. The caller can therefore distinguish
 * provider-reported usage from unavailable usage without fabricating costs.
 */
export function normalizeProviderUsage(
  provider: string,
  payload: unknown,
  requestId?: unknown,
): NormalizedModelUsage {
  const root = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const raw = root.usage && typeof root.usage === "object" && !Array.isArray(root.usage)
    ? root.usage as Record<string, unknown>
    : root.usageMetadata && typeof root.usageMetadata === "object" && !Array.isArray(root.usageMetadata)
    ? root.usageMetadata as Record<string, unknown>
    : {};

  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;

  if (provider === "anthropic") {
    inputTokens = tokenCount(raw.input_tokens);
    outputTokens = tokenCount(raw.output_tokens);
    totalTokens = tokenCount(raw.total_tokens);
  } else if (provider === "google") {
    inputTokens = tokenCount(raw.promptTokenCount);
    outputTokens = tokenCount(raw.candidatesTokenCount);
    totalTokens = tokenCount(raw.totalTokenCount);
  } else {
    // OpenAI-compatible responses (OpenAI, OpenRouter, DeepSeek, Groq,
    // xAI and Mistral) use prompt_tokens/completion_tokens.
    inputTokens = tokenCount(raw.prompt_tokens);
    outputTokens = tokenCount(raw.completion_tokens);
    totalTokens = tokenCount(raw.total_tokens);
  }

  if (totalTokens === null && inputTokens !== null && outputTokens !== null) {
    const sum = inputTokens + outputTokens;
    totalTokens = Number.isSafeInteger(sum) ? sum : null;
  }

  const hasProviderUsage =
    inputTokens !== null || outputTokens !== null || totalTokens !== null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    usageSource: hasProviderUsage ? "provider" : "unavailable",
    requestId: requestReference(requestId),
  };
}
