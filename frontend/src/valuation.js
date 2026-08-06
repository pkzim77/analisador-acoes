const BAZIN_MIN_YIELD = 0.06;
const GRAHAM_MULTIPLIER = 22.5;
const LYNCH_MAX_GROWTH_PERCENT = 25;

// Preço Teto = Dividendo por ação (12m) / yield mínimo desejado (6%).
// DPA é derivado do dividend yield informado pela brapi.dev (DPA = yield x preço atual).
export function calcBazin(dividendYield, price) {
  const yieldNum = Number(dividendYield);
  const priceNum = Number(price);
  if (!dividendYield || !price || yieldNum <= 0 || priceNum <= 0) return null;
  const dividendPerShare = yieldNum * priceNum;
  return dividendPerShare / BAZIN_MIN_YIELD;
}

// Preço Justo = raiz(22.5 x LPA x VPA), critério de P/L <= 15 e P/VP <= 1.5 de Graham.
export function calcGraham(earningsPerShare, bookValue) {
  const eps = Number(earningsPerShare);
  const bvps = Number(bookValue);
  if (!earningsPerShare || !bookValue || eps <= 0 || bvps <= 0) return null;
  return Math.sqrt(GRAHAM_MULTIPLIER * eps * bvps);
}

// Preço Justo = LPA x (crescimento de lucros % + dividend yield %), regra do P/L justo de Peter Lynch.
// O crescimento é limitado a 25% pois o dado da brapi.dev é a variação anual mais recente
// (não uma média de vários anos), sujeita a picos por efeito de base de comparação.
export function calcLynch(earningsPerShare, dividendYield, earningsGrowth) {
  const eps = Number(earningsPerShare);
  if (!earningsPerShare || eps <= 0 || earningsGrowth == null) return null;
  const growthPercent = Math.min(Number(earningsGrowth) * 100, LYNCH_MAX_GROWTH_PERCENT);
  const yieldPercent = dividendYield ? Number(dividendYield) * 100 : 0;
  const fairPriceEarnings = growthPercent + yieldPercent;
  if (fairPriceEarnings <= 0) return null;
  return eps * fairPriceEarnings;
}

// Margem de segurança = quanto o preço teto está acima do preço atual, em %.
// Positivo = ação negociando abaixo do preço justo (descontada); negativo = acima (cara).
export function calcMarginOfSafety(ceiling, price) {
  const ceilingNum = Number(ceiling);
  const priceNum = Number(price);
  if (ceiling == null || price == null || ceilingNum <= 0 || priceNum <= 0) return null;
  return ((ceilingNum - priceNum) / ceilingNum) * 100;
}

// Calcula os 3 métodos de preço teto e suas margens de segurança para uma ação,
// além da margem média entre os métodos disponíveis — usado tanto para exibição quanto para ordenação da tabela.
export function computeValuation(stock) {
  const price = stock.regularMarketPrice;
  const bazinCeiling = calcBazin(stock.dividendYield, price);
  const grahamCeiling = calcGraham(stock.earningsPerShare, stock.bookValue);
  const lynchCeiling = calcLynch(stock.earningsPerShare, stock.dividendYield, stock.earningsGrowth);

  const bazinMargin = calcMarginOfSafety(bazinCeiling, price);
  const grahamMargin = calcMarginOfSafety(grahamCeiling, price);
  const lynchMargin = calcMarginOfSafety(lynchCeiling, price);

  const margins = [bazinMargin, grahamMargin, lynchMargin].filter((m) => m != null);
  const avgMargin = margins.length > 0 ? margins.reduce((sum, m) => sum + m, 0) / margins.length : null;

  return { bazinCeiling, bazinMargin, grahamCeiling, grahamMargin, lynchCeiling, lynchMargin, avgMargin };
}
