function safeCount(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function safeSum(values) {
  let total = 0;
  let hasValue = false;
  for (const value of values) {
    const count = safeCount(value);
    if (count === null) continue;
    const next = total + count;
    if (!Number.isSafeInteger(next)) return null;
    total = next;
    hasValue = true;
  }
  return hasValue ? total : null;
}

/**
 * Summarize only provider-reported usage rows. This is a bounded view of the
 * records supplied by the caller, not a lifetime billing total or price quote.
 */
export function summarizeUsageLogs(logs) {
  const rows = Array.isArray(logs)
    ? logs.filter((log) => log && log.usage_source === "provider")
    : [];

  return {
    calls: rows.length,
    inputTokens: safeSum(rows.map((log) => log.input_tokens)),
    outputTokens: safeSum(rows.map((log) => log.output_tokens)),
    totalTokens: safeSum(rows.map((log) => log.total_tokens)),
    totalReportedCalls: rows.filter((log) => safeCount(log.total_tokens) !== null).length,
  };
}

function safeLabel(value, fallback) {
  if (typeof value !== "string") return fallback;
  const label = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80);
  return label || fallback;
}

/**
 * Group only provider-reported rows by provider and model. Output is bounded
 * because the dashboard currently loads a maximum of 100 recent records.
 */
export function groupUsageByProvider(logs, limit = 6) {
  const rows = Array.isArray(logs)
    ? logs.filter((log) => log && log.usage_source === "provider")
    : [];
  const buckets = new Map();

  for (const log of rows) {
    const provider = safeLabel(log.provider, "Unknown provider");
    const model = safeLabel(log.model, "Unknown model");
    const key = `${provider}\u0000${model}`;
    const bucket = buckets.get(key) || {
      provider,
      model,
      input: [],
      output: [],
      total: [],
      calls: 0,
      totalReportedCalls: 0,
    };

    bucket.calls += 1;
    bucket.input.push(log.input_tokens);
    bucket.output.push(log.output_tokens);
    bucket.total.push(log.total_tokens);
    if (safeCount(log.total_tokens) !== null) bucket.totalReportedCalls += 1;
    buckets.set(key, bucket);
  }

  const safeLimit = Number.isSafeInteger(limit) && limit > 0
    ? Math.min(limit, 20)
    : 6;

  return Array.from(buckets.values())
    .map((bucket) => ({
      provider: bucket.provider,
      model: bucket.model,
      calls: bucket.calls,
      inputTokens: safeSum(bucket.input),
      outputTokens: safeSum(bucket.output),
      totalTokens: safeSum(bucket.total),
      totalReportedCalls: bucket.totalReportedCalls,
    }))
    .sort((a, b) =>
      b.calls - a.calls ||
      a.provider.localeCompare(b.provider) ||
      a.model.localeCompare(b.model)
    )
    .slice(0, safeLimit);
}

