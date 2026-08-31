// Minimal type declarations for yahoo-finance2.
// The package's own types are incomplete (missing chart module),
// so we declare the surface area we actually consume.

declare module 'yahoo-finance2' {
  export interface YahooFinanceOptions {
    [key: string]: unknown;
  }

  export interface ChartQuote {
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
    adjclose?: number | null;
  }

  export interface ChartOptions {
    period1: number | string | Date;
    period2?: number | string | Date;
    interval?:
      | '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m'
      | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';
    includePrePost?: boolean;
    events?: string;
  }

  export interface ChartResult {
    quotes: ChartQuote[];
    meta?: {
      currency?: string;
      symbol?: string;
      exchangeName?: string;
      instrumentType?: string;
      firstTradeDate?: number;
      regularMarketTime?: number;
      gmtoffset?: number;
      timezone?: string;
      exchangeTimezoneName?: string;
      regularMarketPrice?: number;
      chartPreviousClose?: number;
      priceHint?: number;
      [key: string]: unknown;
    };
  }

  interface YahooFinanceInstance {
    chart(symbol: string, options: ChartOptions): Promise<ChartResult>;
    quote(symbols: string | string[], options?: unknown): Promise<unknown>;
    autoc(query: string, options?: unknown): Promise<unknown>;
  }

  interface YahooFinanceConstructor {
    new (options?: YahooFinanceOptions): YahooFinanceInstance;
    (options?: YahooFinanceOptions): YahooFinanceInstance;
  }

  const YahooFinance: YahooFinanceConstructor & {
    chart(symbol: string, options: ChartOptions): Promise<ChartResult>;
  };

  export default YahooFinance;
}
