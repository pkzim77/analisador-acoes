import * as cheerio from "cheerio";

const FUNDAMENTUS_BASE_URL = "https://www.fundamentus.com.br/detalhes.php";

// Fundamentus usa formato numérico brasileiro: ponto para milhar, vírgula para decimal.
function parseBrNumber(text) {
  if (text == null) return null;
  const cleaned = String(text).trim().replace(/\./g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseBrPercent(text) {
  if (text == null) return null;
  const num = parseBrNumber(String(text).replace("%", ""));
  return num == null ? null : num / 100;
}

const EMPTY_RESULT = {
  earningsPerShare: null,
  bookValue: null,
  dividendYield: null,
  earningsGrowth: null,
};

// Busca indicadores fundamentalistas no fundamentus.com.br (fonte não-oficial, sem API).
// Como não é uma API oficial, qualquer falha (rede, ticker sem página, mudança de layout)
// retorna campos nulos em vez de lançar erro — a cotação em si já vem da brapi.dev.
export async function fetchFundamentals(ticker) {
  const url = `${FUNDAMENTUS_BASE_URL}?papel=${encodeURIComponent(ticker)}`;

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    html = await response.text();
  } catch (err) {
    return EMPTY_RESULT;
  }

  const $ = cheerio.load(html);
  const values = {};
  $("td.label").each((_, el) => {
    const label = $(el).find("span.txt").first().text().trim();
    const valueText = $(el).next("td.data").find("span.txt").first().text().trim();
    if (label) values[label] = valueText;
  });

  return {
    earningsPerShare: parseBrNumber(values["LPA"]),
    bookValue: parseBrNumber(values["VPA"]),
    dividendYield: parseBrPercent(values["Div. Yield"]),
    earningsGrowth: parseBrPercent(values["Cres. Rec (5a)"]),
  };
}
