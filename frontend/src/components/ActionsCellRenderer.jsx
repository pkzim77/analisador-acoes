import { useState } from "react";
import { refreshStock, removeStock } from "../api/stocksApi.js";

export default function ActionsCellRenderer({ data, context }) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const updated = await refreshStock(data.ticker);
      context.onRefreshed(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    try {
      await removeStock(data.ticker);
      context.onRemoved(data.ticker);
    } catch (err) {
      setError(err.message);
      setRemoving(false);
    }
  }

  return (
    <div className="actions">
      <button onClick={handleRefresh} disabled={refreshing || removing}>
        {refreshing ? "Atualizando..." : "Atualizar"}
      </button>
      <button onClick={handleRemove} disabled={refreshing || removing}>
        {removing ? "Removendo..." : "Remover"}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
