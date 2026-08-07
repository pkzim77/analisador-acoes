import { buildDuPontRows } from "../dupont.js";
import { formatYield, formatRatio } from "../format.js";

export default function DuPontTable({ stocks }) {
  const { rows, incomplete } = buildDuPontRows(stocks);

  return (
    <section className="detail-section">
      <h2>Análise DuPont</h2>
      <p className="detail-section-intro">
        Decompõe o <strong>ROE</strong> (retorno sobre patrimônio) em três fatores multiplicativos,
        pra entender de onde vem o retorno de cada empresa: <strong>Margem Líquida</strong> (quanto
        sobra de cada R$1 de receita), <strong>Giro de Ativos</strong> (quantas vezes o ativo total
        "gira" em receita por ano) e <strong>Alavancagem</strong> (quanto a empresa usa de capital de
        terceiros pra multiplicar o retorno sobre o capital próprio). Margem e Giro vêm direto do
        fundamentus.com.br; a Alavancagem é obtida isolando o terceiro fator da equação (ROE ÷
        (Margem × Giro)), já que essa fonte não expõe Ativo/Patrimônio Líquido diretamente — por
        isso os três fatores, multiplicados, sempre reconstroem o ROE informado.
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">Nenhuma ação com dados suficientes (Margem Líquida, Giro de Ativos e ROE) ainda.</p>
      ) : (
        <div className="table-scroll">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Nome</th>
                <th>Margem Líquida</th>
                <th>Giro de Ativos</th>
                <th>Alavancagem</th>
                <th>ROE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.ticker}>
                  <td>{s.ticker}</td>
                  <td>{s.shortName || s.longName || "—"}</td>
                  <td>{formatYield(s.netMargin)}</td>
                  <td>{formatRatio(s.assetTurnover)}x</td>
                  <td>{formatRatio(s.equityMultiplier)}x</td>
                  <td className="detail-table-emphasis">{formatYield(s.roe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {incomplete.length > 0 && (
        <p className="detail-note">
          Sem dados suficientes pra decompor ainda: {incomplete.map((s) => s.ticker).join(", ")}.
        </p>
      )}
    </section>
  );
}
