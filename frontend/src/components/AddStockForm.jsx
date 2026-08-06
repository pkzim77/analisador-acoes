import { useState } from "react";
import { addStock } from "../api/stocksApi.js";

export default function AddStockForm({ onAdd }) {
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ticker.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const stock = await addStock(ticker.trim());
      onAdd(stock);
      setTicker("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-stock-form">
      <input
        type="text"
        placeholder="Ex: PETR4"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        disabled={submitting}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Adicionando..." : "Adicionar"}
      </button>
      {error && <span className="error-message">{error}</span>}
    </form>
  );
}
