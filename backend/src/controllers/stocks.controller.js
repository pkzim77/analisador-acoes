import { pool } from "../db.js";
import { fetchQuote, fetchHistory } from "../services/brapiService.js";
import { fetchFundamentals } from "../services/fundamentusService.js";
import { fetchTagAlong } from "../services/statusInvestService.js";

const TICKER_PATTERN = /^[A-Za-z]{4}\d{1,2}$/;

// Preço/variação/setor vêm da brapi.dev; VPA, Dividend Yield e crescimento vêm do
// fundamentus.com.br; Tag Along vem do statusinvest.com.br — nenhuma das outras duas fontes
// expõe esse dado.
async function fetchStockData(ticker) {
  const [quote, fundamentals, tagAlong] = await Promise.all([
    fetchQuote(ticker),
    fetchFundamentals(ticker),
    fetchTagAlong(ticker),
  ]);
  return {
    ...quote,
    earningsPerShare: quote.earningsPerShare ?? fundamentals.earningsPerShare,
    bookValue: fundamentals.bookValue,
    dividendYield: fundamentals.dividendYield,
    earningsGrowth: fundamentals.earningsGrowth,
    evEbit: fundamentals.evEbit,
    roic: fundamentals.roic,
    netMargin: fundamentals.netMargin,
    assetTurnover: fundamentals.assetTurnover,
    roe: fundamentals.roe,
    tagAlong,
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
    sector: row.sector,
    tagAlong: row.tag_along,
    evEbit: row.ev_ebit,
    roic: row.roic,
    netMargin: row.net_margin,
    assetTurnover: row.asset_turnover,
    roe: row.roe,
    dcfPayout: row.dcf_payout,
    dcfRoe: row.dcf_roe,
    dcfDiscountRate: row.dcf_discount_rate,
    dcfYears: row.dcf_years,
    dcfFairValue: row.dcf_fair_value,
    dcfTerminalGrowthRate: row.dcf_terminal_growth_rate,
    dcfOverrides: row.dcf_overrides,
    dcfUpdatedAt: row.dcf_updated_at,
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
        price_earnings, dividend_yield, earnings_per_share, book_value, earnings_growth,
        sector, tag_along, ev_ebit, roic, net_margin, asset_turnover, roe
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
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
        quote.sector,
        quote.tagAlong,
        quote.evEbit,
        quote.roic,
        quote.netMargin,
        quote.assetTurnover,
        quote.roe,
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
        sector = $19,
        tag_along = $20,
        ev_ebit = $21,
        roic = $22,
        net_margin = $23,
        asset_turnover = $24,
        roe = $25,
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
        quote.sector,
        quote.tagAlong,
        quote.evEbit,
        quote.roic,
        quote.netMargin,
        quote.assetTurnover,
        quote.roe,
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

export async function saveDcfProjection(req, res, next) {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const { payout, roe, discountRate, years, terminalGrowthRate, fairValue, overrides } = req.body ?? {};

    const numbers = { payout, roe, discountRate, terminalGrowthRate, fairValue };
    for (const [key, value] of Object.entries(numbers)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return res.status(400).json({ error: `Campo '${key}' inválido` });
      }
    }
    if (!Number.isInteger(years) || years < 1 || years > 30) {
      return res.status(400).json({ error: "Anos de projeção deve ser um inteiro entre 1 e 30" });
    }
    if (discountRate <= 0) {
      return res.status(400).json({ error: "Taxa de desconto deve ser maior que zero" });
    }
    if (discountRate <= terminalGrowthRate) {
      return res.status(400).json({ error: "Taxa de desconto deve ser maior que a taxa de crescimento na perpetuidade" });
    }
    if (overrides != null) {
      if (typeof overrides !== "object" || Array.isArray(overrides)) {
        return res.status(400).json({ error: "Campo 'overrides' inválido" });
      }
      for (const [year, value] of Object.entries(overrides)) {
        if (!Number.isInteger(Number(year)) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
          return res.status(400).json({ error: `Override do ano '${year}' inválido` });
        }
      }
    }

    const existing = await pool.query("SELECT ticker FROM stocks WHERE ticker = $1", [ticker]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Ticker não rastreado" });
    }

    const { rows } = await pool.query(
      `UPDATE stocks SET
        dcf_payout = $2,
        dcf_roe = $3,
        dcf_discount_rate = $4,
        dcf_years = $5,
        dcf_fair_value = $6,
        dcf_terminal_growth_rate = $7,
        dcf_overrides = $8,
        dcf_updated_at = now()
      WHERE ticker = $1
      RETURNING *`,
      [ticker, payout, roe, discountRate, years, fairValue, terminalGrowthRate, JSON.stringify(overrides ?? {})]
    );

    res.json({ stock: rowToStock(rows[0]) });
  } catch (err) {
    next(err);
  }
}
