import { useEffect, useState } from "react";
import { projectDcf, estimateDefaultPayout } from "../dcf.js";
import { saveDcfProjection } from "../api/stocksApi.js";
import { formatPrice, formatPercent, formatRatio, formatYield } from "../format.js";

const DEFAULT_DISCOUNT_RATE_PERCENT = "12";
const DEFAULT_TERMINAL_GROWTH_PERCENT = "3.0";
const DEFAULT_YEARS = "5";

function pctToInput(fraction) {
  return fraction == null ? "" : (Number(fraction) * 100).toFixed(1);
}

function inputToFraction(str) {
  if (str === "" || str == null) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num / 100 : null;
}

function overridesFromStock(stock) {
  if (!stock?.dcfOverrides || typeof stock.dcfOverrides !== "object") return {};
  const result = {};
  for (const [year, value] of Object.entries(stock.dcfOverrides)) {
    result[year] = String(value);
  }
  return result;
}

export default function DcfProjectionTool({ stocks, onSaved }) {
  const [selectedTicker, setSelectedTicker] = useState(stocks[0]?.ticker ?? "");
  const [model, setModel] = useState("ddm");
  const [payoutInput, setPayoutInput] = useState("");
  const [roeInput, setRoeInput] = useState("");
  const [discountRateInput, setDiscountRateInput] = useState(DEFAULT_DISCOUNT_RATE_PERCENT);
  const [terminalGrowthInput, setTerminalGrowthInput] = useState(DEFAULT_TERMINAL_GROWTH_PERCENT);
  const [yearsInput, setYearsInput] = useState(DEFAULT_YEARS);
  const [overrideInputs, setOverrideInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const stock = stocks.find((s) => s.ticker === selectedTicker) ?? null;

  useEffect(() => {
    if (!stock) return;
    setPayoutInput(pctToInput(stock.dcfPayout ?? estimateDefaultPayout(stock)));
    setRoeInput(pctToInput(stock.dcfRoe ?? stock.roe));
    setDiscountRateInput(stock.dcfDiscountRate != null ? pctToInput(stock.dcfDiscountRate) : DEFAULT_DISCOUNT_RATE_PERCENT);
    setTerminalGrowthInput(
      stock.dcfTerminalGrowthRate != null ? pctToInput(stock.dcfTerminalGrowthRate) : DEFAULT_TERMINAL_GROWTH_PERCENT
    );
    setYearsInput(stock.dcfYears != null ? String(stock.dcfYears) : DEFAULT_YEARS);
    setOverrideInputs(overridesFromStock(stock));
    setSaved(false);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker]);

  if (stocks.length === 0) {
    return null;
  }

  const payout = inputToFraction(payoutInput);
  const roe = inputToFraction(roeInput);
  const discountRate = inputToFraction(discountRateInput);
  const terminalGrowthRate = inputToFraction(terminalGrowthInput);
  const years = Number(yearsInput);

  const parsedOverrides = {};
  for (const [year, value] of Object.entries(overrideInputs)) {
    const num = Number(value);
    if (value !== "" && Number.isFinite(num) && num > 0) parsedOverrides[year] = num;
  }

  const projection =
    stock && payout != null && roe != null && discountRate != null && terminalGrowthRate != null && yearsInput !== ""
      ? projectDcf({ eps: stock.earningsPerShare, payout, roe, discountRate, years, terminalGrowthRate, overrides: parsedOverrides, model })
      : { error: "Preencha todos os campos." };

  const currentPrice = stock?.regularMarketPrice != null ? Number(stock.regularMarketPrice) : null;
  const upside =
    projection.fairValue != null && currentPrice ? ((projection.fairValue - currentPrice) / currentPrice) * 100 : null;

  function handleOverrideChange(year, value) {
    setOverrideInputs((prev) => ({ ...prev, [year]: value }));
  }

  function handleClearOverrides() {
    setOverrideInputs({});
  }

  async function handleSave() {
    if (!stock || projection.error) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await saveDcfProjection(stock.ticker, {
        payout,
        roe,
        discountRate,
        years,
        terminalGrowthRate,
        fairValue: projection.fairValue,
        overrides: parsedOverrides,
      });
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasOverrides = Object.keys(parsedOverrides).length > 0;

  return (
    <section className="detail-section">
      <h2>Projeção de Fluxo de Caixa (DCF)</h2>
      <p className="detail-section-intro">
        Modelo em 2 estágios: por padrão, o LPA cresce à <strong>taxa de crescimento sustentável</strong>{" "}
        (ROE × (1 − Payout)) a cada ano — mas você pode clicar em qualquer célula de "LPA projetado"
        na tabela e sobrescrever o valor daquele ano manualmente; os anos seguintes não editados
        continuam crescendo a partir do valor que você digitou. Depois do último ano projetado,
        soma-se um <strong>valor terminal</strong> (perpetuidade de Gordon) usando uma taxa de
        crescimento própria — deliberadamente separada da taxa de curto prazo, porque assumir a
        mesma taxa de crescimento pra sempre infla o valor terminal de forma irrealista.{" "}
        {model === "dcf" ? (
          <>
            No modo <strong>DCF</strong>, o fluxo descontado é o LPA inteiro (proxy do caixa total
            gerado pela firma por ação) — o Payout entra só no cálculo da taxa de crescimento
            (retenção financia o crescimento), sem travar a distribuição.
          </>
        ) : (
          <>
            No modo <strong>DDM</strong>, o fluxo descontado é só a parcela distribuída (LPA × Payout).
          </>
        )}
      </p>

      <div className="dcf-form">
        <label>
          Modelo
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="ddm">Dividendos (DDM)</option>
            <option value="dcf">Fluxo de Caixa (DCF)</option>
          </select>
        </label>
        <label>
          Ação
          <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}>
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker}
              </option>
            ))}
          </select>
        </label>
        <label>
          {model === "dcf" ? "Payout (%) — só p/ crescimento" : "Payout (%)"}
          <input type="number" step="0.1" value={payoutInput} onChange={(e) => setPayoutInput(e.target.value)} />
        </label>
        <label>
          ROE (%)
          <input type="number" step="0.1" value={roeInput} onChange={(e) => setRoeInput(e.target.value)} />
        </label>
        <label>
          Taxa de Desconto (%)
          <input type="number" step="0.1" value={discountRateInput} onChange={(e) => setDiscountRateInput(e.target.value)} />
        </label>
        <label>
          Cresc. na Perpetuidade (%)
          <input type="number" step="0.1" value={terminalGrowthInput} onChange={(e) => setTerminalGrowthInput(e.target.value)} />
        </label>
        <label>
          Anos de projeção
          <select value={yearsInput} onChange={(e) => setYearsInput(e.target.value)}>
            <option value="3">3 anos</option>
            <option value="5">5 anos</option>
            <option value="10">10 anos</option>
          </select>
        </label>
      </div>

      {stock && !stock.earningsPerShare && (
        <p className="error-message">Essa ação não tem LPA (lucro por ação) disponível — não dá pra projetar.</p>
      )}

      {projection.error ? (
        <p className="error-message">{projection.error}</p>
      ) : (
        <>
          <p className="dcf-growth-note">
            Taxa de crescimento sustentável (curto prazo): <strong>{formatYield(projection.growth)}</strong> ao ano ·
            Taxa na perpetuidade: <strong>{formatYield(projection.terminalGrowthRate)}</strong> ao ano
            {hasOverrides && (
              <>
                {" · "}
                <button type="button" className="dcf-clear-overrides" onClick={handleClearOverrides}>
                  Limpar edições manuais
                </button>
              </>
            )}
          </p>
          <div className="table-scroll">
            <table className="detail-table no-highlight">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>LPA projetado (edite se quiser)</th>
                  <th>Crescimento</th>
                  <th>{model === "dcf" ? "Fluxo de Caixa/ação" : "Dividendo/ação"}</th>
                  <th>Valor Presente</th>
                </tr>
              </thead>
              <tbody>
                {projection.rows.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className={`dcf-eps-input ${r.overridden ? "overridden" : ""}`}
                        value={overrideInputs[r.year] ?? r.eps.toFixed(2)}
                        onChange={(e) => handleOverrideChange(r.year, e.target.value)}
                      />
                    </td>
                    <td className={r.growthPercent >= 0 ? "positive" : "negative"}>{formatPercent(r.growthPercent * 100)}</td>
                    <td>{formatPrice(r.cashFlow, stock.currency)}</td>
                    <td>{formatPrice(r.presentValue, stock.currency)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}>Valor terminal (perpetuidade), a valor presente</td>
                  <td>{formatPrice(projection.terminalValuePresent, stock.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="dcf-result">
            <div>
              <span className="dcf-result-label">Valor Justo por Ação</span>
              <span className="dcf-result-value">{formatPrice(projection.fairValue, stock.currency)}</span>
            </div>
            <div>
              <span className="dcf-result-label">Preço Atual</span>
              <span className="dcf-result-value">{formatPrice(currentPrice, stock.currency)}</span>
            </div>
            <div>
              <span className="dcf-result-label">Upside</span>
              <span className={`dcf-result-value ${upside >= 0 ? "positive" : "negative"}`}>
                {upside > 0 ? "+" : ""}
                {formatRatio(upside)}%
              </span>
            </div>
          </div>

          <button type="button" className="refresh-all-button" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar e adicionar à tabela principal"}
          </button>
          {saved && <span className="dcf-saved-note"> Salvo — confira a coluna "Upside DCF" na tabela.</span>}
          {saveError && <p className="error-message">{saveError}</p>}
        </>
      )}
    </section>
  );
}
