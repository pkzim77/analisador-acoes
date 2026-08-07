const numOrNull = (v) => (v == null ? null : Number(v));

// Análise DuPont: decompõe o ROE em 3 fatores multiplicativos —
// ROE = Margem Líquida × Giro de Ativos × Alavancagem (Multiplicador de Capital).
// Margem Líquida e Giro de Ativos vêm direto do fundamentus.com.br; a Alavancagem é
// obtida isolando o terceiro fator da equação (ROE ÷ (Margem × Giro)), já que essa fonte
// não expõe Ativos/Patrimônio Líquido diretamente — por construção, os 3 fatores
// multiplicados sempre reconstroem o ROE informado.
export function calcEquityMultiplier(roe, netMargin, assetTurnover) {
  const roeNum = numOrNull(roe);
  const marginNum = numOrNull(netMargin);
  const turnoverNum = numOrNull(assetTurnover);
  if (roeNum == null || marginNum == null || turnoverNum == null) return null;
  const denominator = marginNum * turnoverNum;
  if (denominator === 0) return null;
  return roeNum / denominator;
}

export function buildDuPontRows(stocks) {
  const rows = stocks.map((s) => {
    const netMargin = numOrNull(s.netMargin);
    const assetTurnover = numOrNull(s.assetTurnover);
    const roe = numOrNull(s.roe);
    return {
      ticker: s.ticker,
      shortName: s.shortName,
      longName: s.longName,
      netMargin,
      assetTurnover,
      roe,
      equityMultiplier: calcEquityMultiplier(roe, netMargin, assetTurnover),
    };
  });

  const complete = rows
    .filter((s) => s.netMargin != null && s.assetTurnover != null && s.roe != null)
    .sort((a, b) => b.roe - a.roe);
  const incomplete = rows.filter((s) => s.netMargin == null || s.assetTurnover == null || s.roe == null);

  return { rows: complete, incomplete };
}
