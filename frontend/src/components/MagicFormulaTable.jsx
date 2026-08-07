import { rankMagicFormula } from "../magicFormula.js";
import { formatYield } from "../format.js";

export default function MagicFormulaTable({ stocks }) {
  const { ranked, ineligible } = rankMagicFormula(stocks);

  return (
    <section className="detail-section">
      <h2>Fórmula Mágica de Joel Greenblatt</h2>
      <p className="detail-section-intro">
        Ranqueia as ações rastreadas por dois critérios: <strong>Earnings Yield</strong> (EBIT ÷
        Valor de Firma — o quão barata a ação está frente ao lucro operacional que gera) e{" "}
        <strong>ROIC</strong> (retorno sobre o capital investido — o quão boa é a empresa em gerar
        retorno). Cada ação recebe uma posição em cada critério; a soma das duas posições é o{" "}
        <strong>score combinado</strong> — quanto menor, melhor a colocação final. Esse ranking
        vale só entre as ações que você está rastreando, não o mercado inteiro.
      </p>

      {ranked.length === 0 ? (
        <p className="empty-state">Nenhuma ação com dados suficientes (EV/EBIT e ROIC) pra ranquear ainda.</p>
      ) : (
        <div className="table-scroll">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Ticker</th>
                <th>Nome</th>
                <th>Earnings Yield</th>
                <th>ROIC</th>
                <th>Rank Earnings Yield</th>
                <th>Rank ROIC</th>
                <th>Score combinado</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s) => (
                <tr key={s.ticker}>
                  <td className="detail-table-emphasis">{s.position}º</td>
                  <td>{s.ticker}</td>
                  <td>{s.shortName || s.longName || "—"}</td>
                  <td>{formatYield(s.earningsYield)}</td>
                  <td>{formatYield(s.roic)}</td>
                  <td>{s.rankEarningsYield}</td>
                  <td>{s.rankRoic}</td>
                  <td>{s.combinedScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ineligible.length > 0 && (
        <p className="detail-note">
          Fora do ranking (sem EV/EBIT ou ROIC — comum em bancos e outras financeiras, que o
          próprio método de Greenblatt exclui): {ineligible.map((s) => s.ticker).join(", ")}.
        </p>
      )}
    </section>
  );
}
