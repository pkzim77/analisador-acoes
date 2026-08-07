import * as cheerio from "cheerio";

const STATUSINVEST_BASE_URL = "https://statusinvest.com.br/acoes";

function parseBrPercent(text) {
  if (text == null) return null;
  const cleaned = String(text).trim().replace("%", "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Busca o Tag Along no statusinvest.com.br (fonte não-oficial, sem API) — a brapi.dev e o
// fundamentus.com.br não expõem esse dado. Mesma postura das outras fontes de scraping:
// qualquer falha retorna null em vez de derrubar a requisição de adicionar/atualizar o ticker.
export async function fetchTagAlong(ticker) {
  const url = `${STATUSINVEST_BASE_URL}/${encodeURIComponent(ticker.toLowerCase())}`;

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    html = await response.text();
  } catch (err) {
    return null;
  }

  const $ = cheerio.load(html);
  let tagAlong = null;
  $("span.sub-value").each((_, el) => {
    const label = $(el).find("span").first().text().trim();
    if (label === "Tag Along") {
      const valueText = $(el).parent().find("strong.value").first().text();
      tagAlong = parseBrPercent(valueText);
    }
  });

  return tagAlong;
}
