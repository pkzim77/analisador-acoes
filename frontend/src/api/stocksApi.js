const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/api/stocks`;

async function handleResponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Erro na requisição (${response.status})`);
  }
  return body;
}

export async function listStocks() {
  const response = await fetch(BASE_URL);
  const body = await handleResponse(response);
  return body.stocks;
}

export async function addStock(ticker) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  const body = await handleResponse(response);
  return body.stock;
}

export async function removeStock(ticker) {
  const response = await fetch(`${BASE_URL}/${ticker}`, { method: "DELETE" });
  await handleResponse(response);
}

export async function refreshStock(ticker) {
  const response = await fetch(`${BASE_URL}/${ticker}/refresh`, { method: "POST" });
  const body = await handleResponse(response);
  return body.stock;
}

export async function fetchHistory(ticker) {
  const response = await fetch(`${BASE_URL}/${ticker}/history`);
  const body = await handleResponse(response);
  return body.history;
}
