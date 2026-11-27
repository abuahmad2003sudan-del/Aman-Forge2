import test from "node:test";
import assert from "node:assert/strict";
import { summarizeUsageLogs } from "./usageSummary.js";

test("summarizes only provider-reported usage records", () => {
  const result = summarizeUsageLogs([
    { usage_source: "provider", input_tokens: 100, output_tokens: 40, total_tokens: 140 },
    { usage_source: "provider", input_tokens: 60, output_tokens: 20, total_tokens: 80 },
    { usage_source: "unavailable", input_tokens: null, output_tokens: null, total_tokens: null },
    { status: "error", input_tokens: 9000, output_tokens: 9000, total_tokens: 18000 },
  ]);

  assert.deepEqual(result, {
    calls: 2,
    inputTokens: 160,
    outputTokens: 60,
    totalTokens: 220,
    totalReportedCalls: 2,
  });
});

test("keeps unavailable fields unknown instead of treating them as zero", () => {
  const result = summarizeUsageLogs([
    { usage_source: "provider", input_tokens: 120, output_tokens: null, total_tokens: null },
    { usage_source: "provider", input_tokens: null, output_tokens: 25, total_tokens: null },
  ]);

  assert.equal(result.calls, 2);
  assert.equal(result.inputTokens, 120);
  assert.equal(result.outputTokens, 25);
  assert.equal(result.totalTokens, null);
  assert.equal(result.totalReportedCalls, 0);
});

test("does not coerce strings, negative values or unsafe integers", () => {
  const result = summarizeUsageLogs([
    { usage_source: "provider", input_tokens: "25", output_tokens: -1, total_tokens: Number.MAX_SAFE_INTEGER + 1 },
    { usage_source: "provider", input_tokens: 5, output_tokens: 7, total_tokens: 12 },
  ]);

  assert.equal(result.calls, 2);
  assert.equal(result.inputTokens, 5);
  assert.equal(result.outputTokens, 7);
  assert.equal(result.totalTokens, 12);
  assert.equal(result.totalReportedCalls, 1);
});

test("returns an empty summary for invalid or missing collections", () => {
  assert.deepEqual(summarizeUsageLogs(null), {
    calls: 0,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    totalReportedCalls: 0,
  });
});
