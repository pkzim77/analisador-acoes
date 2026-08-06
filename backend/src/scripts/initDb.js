import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../../../db/schema.sql");

async function main() {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
  console.log("Schema aplicado com sucesso.");
  await pool.end();
}

main().catch((err) => {
  console.error("Falha ao aplicar schema:", err);
  process.exit(1);
});
