import { Router } from "express";
import {
  listStocks,
  addStock,
  removeStock,
  refreshStock,
  getStockHistory,
  saveDcfProjection,
} from "../controllers/stocks.controller.js";

const router = Router();

router.get("/", listStocks);
router.post("/", addStock);
router.delete("/:ticker", removeStock);
router.post("/:ticker/refresh", refreshStock);
router.get("/:ticker/history", getStockHistory);
router.put("/:ticker/dcf", saveDcfProjection);

export default router;
