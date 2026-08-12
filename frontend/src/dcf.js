// Modelo em 2 estágios, com dois modos:
// - DDM (Desconto de Dividendos): desconta apenas a parcela distribuída (LPA × Payout).
// - DCF (Fluxo de Caixa Descontado): desconta o LPA inteiro (proxy do caixa total gerado pela
//   firma por ação), sem aplicar o Payout como trava na distribuição — o Payout ainda entra no
//   cálculo da taxa de crescimento sustentável (retenção financia o crescimento), mas não limita
//   quanto do caixa é "distribuído" pra fins de valuation.
// Em ambos os modos:
// 1) projeta o LPA ano a ano — por padrão crescendo à taxa de crescimento sustentável
//    (ROE × (1 - Payout)), mas qualquer ano pode ser sobrescrito manualmente (`overrides`),
//    e os anos seguintes não sobrescritos continuam crescendo a partir do valor sobrescrito;
// 2) soma um valor terminal (perpetuidade de Gordon) usando uma taxa de crescimento própria
//    pra perpetuidade — deliberadamente separada da taxa de curto prazo, porque estender uma
//    taxa de crescimento de curto prazo pra sempre infla o valor terminal de forma irrealista.
// Valor Justo por Ação = soma dos fluxos descontados + valor terminal descontado.

export function calcSustainableGrowth(roe, payout) {
  if (roe == null || payout == null) return null;
  return Number(roe) * (1 - Number(payout));
}

export function projectDcf({ eps, payout, roe, discountRate, years, terminalGrowthRate, overrides = {}, model = "ddm" }) {
  const epsNum = Number(eps);
  const payoutNum = Number(payout);
  const roeNum = Number(roe);
  const discountRateNum = Number(discountRate);
  const yearsNum = Number(years);
  const terminalGrowthNum = Number(terminalGrowthRate);

  if (!Number.isFinite(epsNum) || epsNum <= 0) {
    return { error: "LPA (lucro por ação) precisa ser positivo pra projetar." };
  }
  if (!Number.isFinite(payoutNum) || payoutNum < 0) {
    return { error: "Payout inválido." };
  }
  if (!Number.isFinite(roeNum)) {
    return { error: "ROE inválido." };
  }
  if (!Number.isFinite(discountRateNum) || discountRateNum <= 0) {
    return { error: "Taxa de desconto precisa ser maior que zero." };
  }
  if (!Number.isInteger(yearsNum) || yearsNum < 1 || yearsNum > 30) {
    return { error: "Anos de projeção precisa ser um inteiro entre 1 e 30." };
  }
  if (!Number.isFinite(terminalGrowthNum)) {
    return { error: "Taxa de crescimento na perpetuidade inválida." };
  }
  if (discountRateNum <= terminalGrowthNum) {
    return { error: "Taxa de desconto precisa ser maior que a taxa de crescimento na perpetuidade, senão o valor terminal explode." };
  }

  const growth = calcSustainableGrowth(roeNum, payoutNum);

  const rows = [];
  let previousEps = epsNum;
  let sumPresentValue = 0;
  for (let year = 1; year <= yearsNum; year++) {
    const overrideValue = overrides[year];
    const isOverridden = overrideValue != null && Number.isFinite(Number(overrideValue)) && Number(overrideValue) > 0;
    const epsYear = isOverridden ? Number(overrideValue) : previousEps * (1 + growth);
    const yearGrowthPercent = (epsYear - previousEps) / previousEps;
    const cashFlow = model === "dcf" ? epsYear : epsYear * payoutNum;
    const discountFactor = Math.pow(1 + discountRateNum, year);
    const presentValue = cashFlow / discountFactor;
    sumPresentValue += presentValue;
    rows.push({ year, eps: epsYear, growthPercent: yearGrowthPercent, cashFlow, presentValue, overridden: isOverridden });
    previousEps = epsYear;
  }

  const lastCashFlow = rows[rows.length - 1].cashFlow;
  const terminalValue = (lastCashFlow * (1 + terminalGrowthNum)) / (discountRateNum - terminalGrowthNum);
  const terminalValuePresent = terminalValue / Math.pow(1 + discountRateNum, yearsNum);

  const fairValue = sumPresentValue + terminalValuePresent;

  return { rows, growth, terminalGrowthRate: terminalGrowthNum, terminalValue, terminalValuePresent, fairValue, model };
}

// Estimativa inicial de Payout (dividendos pagos ÷ lucro) a partir de dados que já temos,
// pra pré-preencher o formulário — o usuário pode sobrescrever livremente.
export function estimateDefaultPayout(stock) {
  const dividendYield = stock.dividendYield != null ? Number(stock.dividendYield) : null;
  const price = stock.regularMarketPrice != null ? Number(stock.regularMarketPrice) : null;
  const eps = stock.earningsPerShare != null ? Number(stock.earningsPerShare) : null;
  if (dividendYield == null || price == null || !eps) return null;
  const dividendPerShare = dividendYield * price;
  const payout = dividendPerShare / eps;
  return payout > 0 && payout <= 1.5 ? payout : null;
}
