import { useEffect, useMemo, useState } from "react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { computeValuation } from "../valuation.js";
import { calcRSI } from "../technicals.js";
import { rankMagicFormula } from "../magicFormula.js";
import { fetchHistory, refreshStock } from "../api/stocksApi.js";
import {
  formatPrice,
  formatPercent,
  formatDateTime,
  formatVolume,
  formatRatio,
  formatYield,
  formatRange,
  formatCeiling,
  formatMargin,
} from "../format.js";
import ActionsCellRenderer from "./ActionsCellRenderer.jsx";
import Sparkline from "./Sparkline.jsx";
import { LinearMeter, DivergingMeter } from "./Meter.jsx";

ModuleRegistry.registerModules([AllCommunityModule]);

const numOrNull = (v) => (v == null ? null : Number(v));

function buildRow(stock, history, magicFormula) {
  const normalized = {
    ...stock,
    regularMarketPrice: numOrNull(stock.regularMarketPrice),
    regularMarketChange: numOrNull(stock.regularMarketChange),
    regularMarketChangePercent: numOrNull(stock.regularMarketChangePercent),
    regularMarketVolume: numOrNull(stock.regularMarketVolume),
    fiftyTwoWeekLow: numOrNull(stock.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: numOrNull(stock.fiftyTwoWeekHigh),
    priceEarnings: numOrNull(stock.priceEarnings),
    dividendYield: numOrNull(stock.dividendYield),
    earningsPerShare: numOrNull(stock.earningsPerShare),
    bookValue: numOrNull(stock.bookValue),
    earningsGrowth: numOrNull(stock.earningsGrowth),
    tagAlong: numOrNull(stock.tagAlong),
    dcfFairValue: numOrNull(stock.dcfFairValue),
  };
  const dcfUpside =
    normalized.dcfFairValue != null && normalized.regularMarketPrice
      ? ((normalized.dcfFairValue - normalized.regularMarketPrice) / normalized.regularMarketPrice) * 100
      : null;
  return {
    ...normalized,
    ...computeValuation(normalized),
    history,
    rsi: history ? calcRSI(history) : null,
    magicFormulaPosition: magicFormula?.position ?? null,
    magicFormulaTotal: magicFormula?.total ?? null,
    dcfUpside,
  };
}

const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true,
};

const PL_MAX = 30;
const DIVIDEND_YIELD_MAX = 0.15;
const MARGIN_CAP = 100;
const REFRESH_ALL_CONCURRENCY = 3;

export default function StocksTable({ stocks, onRemoved, onRefreshed }) {
  const [historyByTicker, setHistoryByTicker] = useState({});
  const [onlyGoodBuys, setOnlyGoodBuys] = useState(false);
  const [refreshAllState, setRefreshAllState] = useState(null);

  async function handleRefreshAll() {
    const tickers = stocks.map((s) => s.ticker);
    const queue = [...tickers];
    const failed = [];
    setRefreshAllState({ done: 0, total: tickers.length });

    async function worker() {
      while (queue.length > 0) {
        const ticker = queue.shift();
        try {
          const updated = await refreshStock(ticker);
          onRefreshed(updated);
        } catch (err) {
          failed.push(ticker);
        }
        setRefreshAllState((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    await Promise.all(Array.from({ length: REFRESH_ALL_CONCURRENCY }, worker));
    setRefreshAllState(failed.length > 0 ? { done: tickers.length, total: tickers.length, failed } : null);
  }

  useEffect(() => {
    const missing = stocks.map((s) => s.ticker).filter((t) => !(t in historyByTicker));
    if (missing.length === 0) return;
    missing.forEach((ticker) => {
      fetchHistory(ticker)
        .then((history) => setHistoryByTicker((prev) => ({ ...prev, [ticker]: history })))
        .catch(() => setHistoryByTicker((prev) => ({ ...prev, [ticker]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks]);

  const rowData = useMemo(() => {
    const { ranked, total } = rankMagicFormula(stocks);
    const magicFormulaByTicker = new Map(ranked.map((r) => [r.ticker, { position: r.position, total }]));
    const rows = stocks.map((stock) =>
      buildRow(stock, historyByTicker[stock.ticker], magicFormulaByTicker.get(stock.ticker))
    );
    return onlyGoodBuys ? rows.filter((r) => r.grahamMargin > 0) : rows;
  }, [stocks, historyByTicker, onlyGoodBuys]);

  const columnDefs = useMemo(
    () => [
      { field: "ticker", headerName: "Ticker", pinned: "left", width: 100 },
      { field: "sector", headerName: "Setor", valueFormatter: (p) => p.value || "—", width: 150 },
      {
        field: "tagAlong",
        headerName: "Tag Along",
        headerTooltip:
          "% do preço pago ao controlador que os minoritários recebem numa venda de controle. 100% = proteção total.",
        cellRenderer: (p) => {
          if (p.value == null) return "—";
          const cls = p.value >= 100 ? "positive" : p.value >= 80 ? "warning-text" : "negative";
          return <span className={cls}>{Number(p.value).toFixed(0)}%</span>;
        },
        width: 110,
      },
      {
        headerName: "Sinal",
        valueGetter: (p) => (p.data.grahamMargin > 0 ? "boa-compra" : ""),
        cellRenderer: (p) =>
          p.data.grahamMargin > 0 ? <span className="signal-badge">Boa compra</span> : null,
        headerTooltip: "Preço atual abaixo do preço justo de Graham.",
        width: 110,
      },
      {
        field: "magicFormulaPosition",
        headerName: "Magic Formula",
        headerTooltip:
          "Posição no ranking da Fórmula Mágica de Greenblatt entre as ações rastreadas (Earnings Yield + ROIC). Veja a tabela detalhada abaixo.",
        cellRenderer: (p) => {
          if (p.value == null) return "—";
          const cls = p.value === 1 ? "signal-badge" : "";
          return <span className={cls}>{p.value}º de {p.data.magicFormulaTotal}</span>;
        },
        width: 130,
      },
      { field: "regularMarketPrice", headerName: "Preço", valueFormatter: (p) => formatPrice(p.value, p.data.currency), width: 110 },
      {
        field: "regularMarketChange",
        headerName: "Variação",
        valueFormatter: (p) => formatPrice(p.value, p.data.currency),
        cellClassRules: { positive: (p) => p.value > 0, negative: (p) => p.value < 0 },
        width: 110,
      },
      {
        field: "regularMarketChangePercent",
        headerName: "Variação %",
        cellRenderer: (p) => {
          if (p.value == null) return "—";
          const up = p.value >= 0;
          return (
            <span className={`change-chip ${up ? "positive" : "negative"}`}>
              <span className="arrow">{up ? "▲" : "▼"}</span>
              {formatPercent(p.value)}
            </span>
          );
        },
        width: 120,
      },
      {
        headerName: "Tendência",
        valueGetter: (p) => p.data.regularMarketPrice,
        cellRenderer: (p) => (
          <div className="sparkline-cell">
            <Sparkline history={p.data.history} />
          </div>
        ),
        sortable: false,
        filter: false,
        width: 110,
      },
      {
        field: "rsi",
        headerName: "RSI (14)",
        headerTooltip: "Índice de Força Relativa simplificado (14 dias). <30 sobrevendido, >70 sobrecomprado.",
        cellRenderer: (p) => {
          if (p.value == null) return "—";
          if (p.value > 70) {
            return <span className="rsi-badge warning">⚠ {p.value.toFixed(0)} sobrecomprado</span>;
          }
          if (p.value < 30) {
            return <span className="rsi-badge good">{p.value.toFixed(0)} sobrevendido</span>;
          }
          return <span>{p.value.toFixed(0)}</span>;
        },
        width: 170,
      },
      { field: "regularMarketVolume", headerName: "Volume", valueFormatter: (p) => formatVolume(p.value), width: 100 },
      {
        headerName: "Faixa 52 sem.",
        valueGetter: (p) => formatRange(p.data.fiftyTwoWeekLow, p.data.fiftyTwoWeekHigh),
        width: 140,
      },
      {
        field: "priceEarnings",
        headerName: "P/L",
        cellRenderer: (p) => <LinearMeter value={p.value} max={PL_MAX} label={formatRatio(p.value)} />,
        width: 100,
      },
      {
        field: "dividendYield",
        headerName: "Div. Yield",
        cellRenderer: (p) => <LinearMeter value={p.value} max={DIVIDEND_YIELD_MAX} label={formatYield(p.value)} />,
        width: 110,
      },
      {
        field: "bazinMargin",
        headerName: "Teto Bazin",
        headerTooltip: "Preço Teto = Dividendo por ação (12m) / 6%.",
        cellRenderer: (p) => (
          <DivergingMeter value={p.value} cap={MARGIN_CAP} label={formatCeiling(p.data.bazinCeiling, p.value, p.data.currency)} />
        ),
        width: 175,
      },
      {
        field: "grahamMargin",
        headerName: "Preço Graham",
        headerTooltip: "Preço Justo = √(22,5 × LPA × VPA).",
        cellRenderer: (p) => (
          <DivergingMeter value={p.value} cap={MARGIN_CAP} label={formatCeiling(p.data.grahamCeiling, p.value, p.data.currency)} />
        ),
        width: 175,
      },
      {
        field: "lynchMargin",
        headerName: "Preço Lynch",
        headerTooltip: "Preço Justo = LPA × (Crescimento de lucros % [limitado a 25%] + Dividend Yield %).",
        cellRenderer: (p) => (
          <DivergingMeter value={p.value} cap={MARGIN_CAP} label={formatCeiling(p.data.lynchCeiling, p.value, p.data.currency)} />
        ),
        width: 175,
      },
      {
        field: "avgMargin",
        headerName: "Margem Média",
        headerTooltip: "Média das margens de segurança disponíveis entre Bazin, Graham e Lynch.",
        cellRenderer: (p) => <DivergingMeter value={p.value} cap={MARGIN_CAP} label={formatMargin(p.value)} />,
        width: 135,
      },
      {
        field: "dcfUpside",
        headerName: "Upside DCF",
        headerTooltip: "Valor justo por ação calculado na ferramenta de Projeção de Fluxo de Caixa (DCF), abaixo. '—' até você projetar essa ação.",
        cellRenderer: (p) => (
          <DivergingMeter value={p.value} cap={MARGIN_CAP} label={formatCeiling(p.data.dcfFairValue, p.value, p.data.currency)} />
        ),
        width: 175,
      },
      { field: "updatedAt", headerName: "Atualizado em", valueFormatter: (p) => formatDateTime(p.value), width: 160 },
      {
        headerName: "Ações",
        cellRenderer: ActionsCellRenderer,
        sortable: false,
        filter: false,
        width: 190,
      },
    ],
    []
  );

  if (stocks.length === 0) {
    return <p className="empty-state">Nenhuma ação adicionada ainda.</p>;
  }

  return (
    <div>
      <div className="table-toolbar">
        <label className="quick-filter">
          <input type="checkbox" checked={onlyGoodBuys} onChange={(e) => setOnlyGoodBuys(e.target.checked)} />
          Mostrar só boas compras (preço abaixo do preço Graham)
        </label>
        <button
          type="button"
          className="refresh-all-button"
          onClick={handleRefreshAll}
          disabled={refreshAllState != null && !refreshAllState.failed}
        >
          {refreshAllState != null && !refreshAllState.failed
            ? `Atualizando ${refreshAllState.done}/${refreshAllState.total}...`
            : "Atualizar todas"}
        </button>
        {refreshAllState?.failed?.length > 0 && (
          <span className="error-message">Falha ao atualizar: {refreshAllState.failed.join(", ")}</span>
        )}
      </div>
      <div className="table-scroll">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.ticker}
          domLayout="autoHeight"
          rowHeight={54}
          context={{ onRemoved, onRefreshed }}
        />
      </div>
    </div>
  );
}
