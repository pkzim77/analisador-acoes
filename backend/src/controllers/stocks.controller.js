import { pool } from "../db.js";
import { fetchQuote, fetchHistory } from "../services/brapiService.js";
import { fetchFundamentals } from "../services/fundamentusService.js";

const TICKER_PATTERN = /^[A-Za-z]{4}\d{1,2}$/;

// Preço/variação vêm da brapi.dev; VPA, Dividend Yield e crescimento vêm do fundamentus.com.br
// (o plano gratuito da brapi.dev não libera esses indicadores de forma confiável).
async function fetchStockData(ticker) {
  const quote = await fetchQuote(ticker);
  const fundamentals = await fetchFundamentals(ticker);
  return {
    ...quote,
    earningsPerShare: quote.earningsPerShare ?? fundamentals.earningsPerShare,
    bookValue: fundamentals.bookValue,
    dividendYield: fundamentals.dividendYield,
    earningsGrowth: fundamentals.earningsGrowth,
  };
}

function rowToStock(row) {
  return {
    ticker: row.ticker,
    shortName: row.short_name,
    longName: row.long_name,
    currency: row.currency,
    regularMarketPrice: row.regular_market_price,
    regularMarketChange: row.regular_market_change,
    regularMarketChangePercent: row.regular_market_change_percent,
    marketCap: row.market_cap,
    logoUrl: row.logo_url,
    marketTime: row.market_time,
    fiftyTwoWeekLow: row.fifty_two_week_low,
    fiftyTwoWeekHigh: row.fifty_two_week_high,
    regularMarketVolume: row.regular_market_volume,
    priceEarnings: row.price_earnings,
    dividendYield: row.dividend_yield,
    earningsPerShare: row.earnings_per_share,
    bookValue: row.book_value,
    earningsGrowth: row.earnings_growth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStocks(req, res, next) {
  try {
    const { rows } = await pool.query("SELECT * FROM stocks ORDER BY ticker");
    res.json({ stocks: rows.map(rowToStock) });
  } catch (err) {
    next(err);
  }
}

export async function addStock(req, res, next) {
  try {
    const rawTicker = req.body?.ticker;
    if (!rawTicker || typeof rawTicker !== "string" || !TICKER_PATTERN.test(rawTicker.trim())) {
      return res.status(400).json({ error: "Ticker inválido ou ausente" });
    }
    const ticker = rawTicker.trim().toUpperCase();

    const quote = await fetchStockData(ticker);

    const { rows } = await pool.query(
      `INSERT INTO stocks (
        ticker, short_name, long_name, currency,
        regular_market_price, regular_market_change, regular_market_change_percent,
        market_cap, logo_url, market_time,
        fifty_two_week_low, fifty_two_week_high, regular_market_volume,
        price_earnings, dividend_yield, earnings_per_share, book_value, earnings_growth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        ticker,
        quote.shortName,
        quote.longName,
        quote.currency,
        quote.regularMarketPrice,
        quote.regularMarketChange,
        quote.regularMarketChangePercent,
        quote.marketCap,
        quote.logoUrl,
        quote.marketTime,
        quote.fiftyTwoWeekLow,
        quote.fiftyTwoWeekHigh,
        quote.regularMarketVolume,
        quote.priceEarnings,
        quote.dividendYield,
        quote.earningsPerShare,
        quote.bookValue,
        quote.earningsGrowth,
      ]
    );

    res.status(201).json({ stock: rowToStock(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: `Ticker '${req.body?.ticker?.toUpperCase()}' já está sendo rastreado` });
    }
    next(err);
  }
}

export async function removeStock(req, res, next) {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const { rowCount } = await pool.query("DELETE FROM stocks WHERE ticker = $1", [ticker]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Ticker não rastreado" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function refreshStock(req, res, next) {
  try {
    const ticker = req.params.ticker.toUpperCase();

    const existing = await pool.query("SELECT ticker FROM stocks WHERE ticker = $1", [ticker]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Ticker não rastreado" });
    }

    const quote = await fetchStockData(ticker);

    const { rows } = await pool.query(
      `UPDATE stocks SET
        short_name = $2,
        long_name = $3,
        currency = $4,
        regular_market_price = $5,
        regular_market_change = $6,
        regular_market_change_percent = $7,
        market_cap = $8,
        logo_url = $9,
        market_time = $10,
        fifty_two_week_low = $11,
        fifty_two_week_high = $12,
        regular_market_volume = $13,
        price_earnings = $14,
        dividend_yield = $15,
        earnings_per_share = $16,
        book_value = $17,
        earnings_growth = $18,
        updated_at = now()
      WHERE ticker = $1
      RETURNING *`,
      [
        ticker,
        quote.shortName,
        quote.longName,
        quote.currency,
        quote.regularMarketPrice,
        quote.regularMarketChange,
        quote.regularMarketChangePercent,
        quote.marketCap,
        quote.logoUrl,
        quote.marketTime,
        quote.fiftyTwoWeekLow,
        quote.fiftyTwoWeekHigh,
        quote.regularMarketVolume,
        quote.priceEarnings,
        quote.dividendYield,
        quote.earningsPerShare,
        quote.bookValue,
        quote.earningsGrowth,
      ]
    );

    res.json({ stock: rowToStock(rows[0]) });
  } catch (err) {
    next(err);
  }
}

export async function getStockHistory(req, res, next) {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const history = await fetchHistory(ticker);
    res.json({ history });
  } catch (err) {
    next(err);
  }
}
