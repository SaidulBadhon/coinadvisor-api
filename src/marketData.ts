const SUPRA_API_KEY = Bun.env.SUPRA_API_KEY!;
const SUPRA_BASE_URL = Bun.env.SUPRA_BASE_URL!; // e.g. https://prod-kline-rest.supra.com

export type SpotPrice = {
  symbol: string;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number;
  timestamp: string;
};

/**
 * Fetch the latest price data for a given trading pair (e.g., 'btc_usdt').
 */
export async function fetchLatestPrice(symbol: string): Promise<SpotPrice> {
  // Map common symbol variations to Supra API format
  const symbolMap: Record<string, string> = {
    matic: "pol", // MATIC is now POL on many exchanges
    polygon: "pol",
  };

  const mappedSymbol = symbolMap[symbol.toLowerCase()] || symbol.toLowerCase();
  const tradingPair = `${mappedSymbol}_usdt`;
  //   const url = `${SUPRA_BASE_URL}/latest?trading_pair=${tradingPair}`;
  const url = `${SUPRA_BASE_URL}/latest?trading_pair=${tradingPair}&pageSize=1`;

  const res = await fetch(url, { headers: { "x-api-key": SUPRA_API_KEY } });
  if (!res.ok)
    throw new Error(`Supra latest price fetch failed: ${res.statusText}`);
  const json = await res.json();

  // Supra returns pagination metadata with 'instruments' array
  const inst = Array.isArray(json.instruments)
    ? json.instruments[0]
    : Array.isArray(json.data)
    ? json.data[0]
    : undefined;
  if (!inst) {
    if (json.totalRecords === 0) {
      throw new Error(`No data found for trading pair: ${tradingPair}`);
    }
    throw new Error(
      `Unexpected Supra response format: ${JSON.stringify(json)}`
    );
  }

  // Map known field variations
  const price = inst.currentPrice ?? inst.price ?? inst.last_price;
  const high24 = inst["24h_high"] ?? inst["high_24h"];
  const low24 = inst["24h_low"] ?? inst["low_24h"];
  const change24 = inst["24h_change"] ?? inst["percent_change_24h"];
  const timestamp = inst.timestamp ?? inst.last_updated;

  return {
    symbol: symbol.toUpperCase(),
    currentPrice: parseFloat(price),
    high24h: parseFloat(high24),
    low24h: parseFloat(low24),
    change24h: parseFloat(change24),
    timestamp: timestamp,
  };
}

/**
 * Fetch historical OHLC data for a symbol over a given interval.
 */
export async function fetchHistoricalPrices(
  symbol: string,
  startDate: number,
  endDate: number,
  intervalSec: number
): Promise<
  Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>
> {
  // Use the same symbol mapping as fetchLatestPrice
  const symbolMap: Record<string, string> = {
    matic: "pol", // MATIC is now POL on many exchanges
    polygon: "pol",
  };

  const mappedSymbol = symbolMap[symbol.toLowerCase()] || symbol.toLowerCase();
  const tradingPair = `${mappedSymbol}_usdt`;
  const url = new URL(`${SUPRA_BASE_URL}/history`);
  url.searchParams.set("trading_pair", tradingPair);
  url.searchParams.set("startDate", startDate.toString());
  url.searchParams.set("endDate", endDate.toString());
  url.searchParams.set("interval", intervalSec.toString());

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": SUPRA_API_KEY },
  });
  if (!res.ok)
    throw new Error(`Supra historical fetch failed: ${res.statusText}`);
  const json = await res.json();

  // Handle both direct array and wrapped formats
  const dataArray = Array.isArray(json) ? json : json.data;
  if (!Array.isArray(dataArray))
    throw new Error(`Unexpected Supra history format: ${JSON.stringify(json)}`);

  return dataArray.map((d: any) => ({
    timestamp: d.time || d.timestamp,
    open: parseFloat(d.open),
    high: parseFloat(d.high),
    low: parseFloat(d.low),
    close: parseFloat(d.close),
    volume: parseFloat(d.volume || 0),
  }));
}
/**
 * Get both latest and recent historical prices for a list of symbols.
 */
export async function getMarketData(symbols: string[]) {
  // Latest prices
  const latestPromises = symbols.map(fetchLatestPrice);
  const latest = await Promise.all(latestPromises);

  // Optionally fetch history for backtesting or metrics
  // Example: last 24h at hourly interval
  const now = Date.now();
  const historyPromises = symbols.map((sym) =>
    fetchHistoricalPrices(sym, now - 24 * 3600 * 1000, now, 3600)
  );
  const history = await Promise.all(historyPromises);

  return { latest, history };
}
