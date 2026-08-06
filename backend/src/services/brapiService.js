const BRAPI_BASE_URL = "https://brapi.dev/api/quote";

export class TickerNotFoundError extends Error {
  constructor(ticker) {
    super(`Ticker '${ticker}' não encontrado na B3`);
    this.status = 404;
  }
}

export class UpstreamError extends Error {
  constructor(message) {
    super(message);
    this.status = 502;
  }
}

function normalizeQuote(result) {
  return {
    ticker: result.symbol,
    shortName: result.shortName ?? null,
    longName: result.longName ?? null,
    currency: result.currency ?? null,
    regularMarketPrice: result.regularMarketPrice ?? null,
    regularMarketChange: result.regularMarketChange ?? null,
    regularMarketChangePercent: result.regularMarketChangePercent ?? null,
    marketCap: result.marketCap ?? null,
    logoUrl: result.logourl ?? null,
    marketTime: result.regularMarketTime ?? null,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? null,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? null,
    regularMarketVolume: result.regularMarketVolume ?? null,
    priceEarnings: result.priceEarnings ?? null,
    earningsPerShare: result.earningsPerShare ?? null,
  };
}

export async function fetchQuote(ticker) {
  const url = `${BRAPI_BASE_URL}/${encodeURIComponent(ticker)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
      },
    });
  } catch (err) {
    throw new UpstreamError("Falha ao conectar com a brapi.dev");
  }

  if (!response.ok && response.status !== 404) {
    throw new UpstreamError(`brapi.dev respondeu com status ${response.status}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new UpstreamError("Resposta inválida da brapi.dev");
  }

  const result = body?.results?.[0];
  if (!result || body?.error) {
    throw new TickerNotFoundError(ticker);
  }

  return normalizeQuote(result);
}

// Histórico curto (1 mês, candles diários) usado só para desenhar o sparkline —
// não é persistido no banco, é buscado sob demanda a cada carregamento da tabela.
export async function fetchHistory(ticker) {
  const url = `${BRAPI_BASE_URL}/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
      },
    });
  } catch (err) {
    throw new UpstreamError("Falha ao conectar com a brapi.dev");
  }

  if (!response.ok && response.status !== 404) {
    throw new UpstreamError(`brapi.dev respondeu com status ${response.status}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new UpstreamError("Resposta inválida da brapi.dev");
  }

  const result = body?.results?.[0];
  if (!result || body?.error) {
    throw new TickerNotFoundError(ticker);
  }

  return (result.historicalDataPrice || []).map((point) => ({
    date: point.date,
    close: point.close,
  }));
}
