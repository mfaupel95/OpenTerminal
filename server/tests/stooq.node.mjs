import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { history, quote } from "../src/providers/stooq.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
// No network or application imports: every provider request gets an in-memory CSV.
function csv(body) {
  globalThis.fetch = async () => ({ ok: true, text: async () => body });
}
const quoteHeader = "Symbol,Date,Time,Open,High,Low,Close,Volume\n";

test("rejects missing and non-finite quote prices", async () => {
  for (const price of ["", " ", "N/D", "Infinity", "NaN"]) {
    csv(quoteHeader + `AAPL.US,2026-11-06,22:00:00,1,2,1,${price},10`);
    await assert.rejects(quote("AAPL"), /stooq: no quote/);
  }
});

test("preserves finite zero values and nulls invalid optional fields", async () => {
  csv(quoteHeader + "AAPL.US,2026-11-06,22:00:00,0,Infinity,N/D,0,0");
  const result = await quote("aapl");
  assert.equal(result.price, 0);
  assert.equal(result.open, 0);
  assert.equal(result.high, null);
  assert.equal(result.low, null);
  assert.equal(result.volume, 0);
});

test("skips candles with any missing or non-finite OHLC field", async () => {
  csv("Date,Open,High,Low,Close,Volume\n" + [
    "2026-11-01,1,2,1,2,10",
    "2026-11-02,N/D,2,1,2,10",
    "2026-11-03,1,Infinity,1,2,10",
    "2026-11-04,1,2,,2,10",
    "2026-11-05,1,2,1,,10",
    "2026-11-06,0,0,0,0,Infinity",
    "bad-date,1,2,1,2,10",
  ].join("\n"));
  const result = await history("AAPL");
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { time: Date.parse("2026-11-01T00:00:00Z") / 1000, open: 1, high: 2, low: 1, close: 2, volume: 10 });
  assert.equal(result[1].close, 0);
  assert.equal(result[1].volume, 0);
});

test("accepts CRLF CSV and propagates HTTP failures", async () => {
  csv("Date,Open,High,Low,Close,Volume\r\n2026-11-06,1,2,1,2,10\r\n");
  assert.equal((await history("AAPL"))[0].volume, 10);
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(history("AAPL"), /stooq 503/);
  await assert.rejects(quote("AAPL"), /stooq 503/);
});
