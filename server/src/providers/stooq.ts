import type { Candle, Quote } from "./yahoo.js";

// Empty CSV cells are missing data, not zero; JSON cannot represent Infinity.
function finiteCell(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Map a Yahoo-style symbol to Stooq's convention (US equities get a .us suffix). */
function stooqSymbol(symbol: string): string {
  const s = symbol.toLowerCase();
  if (s.startsWith("^")) return s; // indexes share the caret convention
  if (s.includes(".") || s.includes("=") || s.includes("-")) return s;
  return s + ".us";
}

export async function history(symbol: string): Promise<Candle[]> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol(symbol))}&i=d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`stooq ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2 || !lines[0].startsWith("Date")) throw new Error("stooq: no data for " + symbol);
  const candles: Candle[] = [];
  for (const line of lines.slice(1)) {
    const [date, open, high, low, close, volume] = line.split(",");
    const t = Date.parse(date + "T00:00:00Z") / 1000;
    const o = finiteCell(open), h = finiteCell(high), l = finiteCell(low), c = finiteCell(close);
    if (!Number.isFinite(t) || o === null || h === null || l === null || c === null) continue;
    candles.push({ time: t, open: o, high: h, low: l, close: c, volume: finiteCell(volume) ?? 0 });
  }
  return candles;
}

export async function quote(symbol: string): Promise<Quote> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol(symbol))}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`stooq ${res.status}`);
  const lines = (await res.text()).trim().split("\n");
  if (lines.length < 2) throw new Error("stooq: empty quote");
  const [sym, , , open, high, low, close, volume] = lines[1].split(",");
  const price = finiteCell(close);
  if (price === null) throw new Error("stooq: no quote for " + symbol);
  return {
    symbol: symbol.toUpperCase(),
    name: sym,
    price,
    change: null,
    changePercent: null,
    open: finiteCell(open),
    high: finiteCell(high),
    low: finiteCell(low),
    previousClose: null,
    bid: null,
    ask: null,
    volume: finiteCell(volume),
    avgVolume: null,
    marketCap: null,
    pe: null,
    eps: null,
    dividendYield: null,
    week52High: null,
    week52Low: null,
    beta: null,
    sharesOutstanding: null,
    currency: null,
    exchange: "Stooq",
    marketState: null,
    time: null,
    source: "stooq",
  };
}
