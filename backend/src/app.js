import express from "express";
import cors from "cors";
import stocksRoutes from "./routes/stocks.routes.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.use("/api/stocks", stocksRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Erro interno do servidor" });
});

export default app;
