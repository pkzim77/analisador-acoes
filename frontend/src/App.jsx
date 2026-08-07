import { useEffect, useState } from "react";
import { listStocks } from "./api/stocksApi.js";
import AddStockForm from "./components/AddStockForm.jsx";
import StocksTable from "./components/StocksTable.jsx";
import MagicFormulaTable from "./components/MagicFormulaTable.jsx";
import DuPontTable from "./components/DuPontTable.jsx";

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listStocks()
      .then(setStocks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleAdd(stock) {
    setStocks((prev) => [...prev, stock].sort((a, b) => a.ticker.localeCompare(b.ticker)));
  }

  function handleRemoved(ticker) {
    setStocks((prev) => prev.filter((s) => s.ticker !== ticker));
  }

  function handleRefreshed(updated) {
    setStocks((prev) => prev.map((s) => (s.ticker === updated.ticker ? updated : s)));
  }

  return (
    <main className="app">
      <h1>Analisador de Ações</h1>
      <AddStockForm onAdd={handleAdd} />

      {loading && <p>Carregando...</p>}
      {error && <p className="error-message">Não foi possível carregar as ações: {error}</p>}
      {!loading && !error && (
        <>
          <StocksTable stocks={stocks} onRemoved={handleRemoved} onRefreshed={handleRefreshed} />
          <MagicFormulaTable stocks={stocks} />
          <DuPontTable stocks={stocks} />
        </>
      )}
    </main>
  );
}
