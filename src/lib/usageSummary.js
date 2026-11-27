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
