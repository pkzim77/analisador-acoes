CREATE TABLE IF NOT EXISTS stocks (
  ticker                         VARCHAR(10) PRIMARY KEY,
  short_name                     TEXT,
  long_name                      TEXT,
  currency                       VARCHAR(10),
  regular_market_price           NUMERIC(18,4),
  regular_market_change          NUMERIC(18,4),
  regular_market_change_percent  NUMERIC(9,4),
  market_cap                     NUMERIC(20,2),
  logo_url                       TEXT,
  market_time                    TIMESTAMPTZ,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stocks ADD COLUMN IF NOT EXISTS fifty_two_week_low  NUMERIC(18,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS fifty_two_week_high NUMERIC(18,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS regular_market_volume BIGINT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS price_earnings NUMERIC(18,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC(9,6);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS earnings_per_share NUMERIC(18,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS book_value NUMERIC(18,4);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS earnings_growth NUMERIC(9,6);
