const numOrNull = (v) => (v == null ? null : Number(v));

// Earnings Yield = EBIT / Enterprise Value = 1 / (EV/EBIT). Quanto maior, mais "barata"
// a ação está em relação ao lucro operacional que gera.
export function calcEarningsYield(evEbit) {
  const num = Number(evEbit);
  if (evEbit == null || !Number.isFinite(num) || num <= 0) return null;
  return 1 / num;
}

// Fórmula Mágica de Joel Greenblatt: ranqueia as ações por dois critérios —
// Earnings Yield (o quão barata está) e Return on Capital / ROIC (o quão boa é a empresa) —
// e soma as duas posições. Quanto menor a soma, melhor a colocação final.
// Empresas sem EBIT positivo (comum em bancos/financeiras) ficam fora do ranking,
// igual no método original de Greenblatt, que exclui financeiras e utilities.
export function rankMagicFormula(stocks) {
  const candidates = stocks.map((s) => {
    const evEbit = numOrNull(s.evEbit);
    const roic = numOrNull(s.roic);
    return {
      ticker: s.ticker,
      shortName: s.shortName,
      longName: s.longName,
      evEbit,
      roic,
      earningsYield: calcEarningsYield(evEbit),
    };
  });

  const eligible = candidates.filter((s) => s.earningsYield != null && s.roic != null);
  const ineligible = candidates.filter((s) => s.earningsYield == null || s.roic == null);

  const byEarningsYield = [...eligible].sort((a, b) => b.earningsYield - a.earningsYield);
  const byRoic = [...eligible].sort((a, b) => b.roic - a.roic);

  const rankEYByTicker = new Map(byEarningsYield.map((s, i) => [s.ticker, i + 1]));
  const rankRoicByTicker = new Map(byRoic.map((s, i) => [s.ticker, i + 1]));

  const ranked = eligible
    .map((s) => {
      const rankEarningsYield = rankEYByTicker.get(s.ticker);
      const rankRoic = rankRoicByTicker.get(s.ticker);
      return {
        ...s,
        rankEarningsYield,
        rankRoic,
        combinedScore: rankEarningsYield + rankRoic,
      };
    })
    .sort((a, b) => a.combinedScore - b.combinedScore)
    .map((s, i) => ({ ...s, position: i + 1 }));

  return { ranked, total: ranked.length, ineligible };
}
