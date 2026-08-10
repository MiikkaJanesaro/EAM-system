import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readAll, create, update, remove } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// GET /api/workorders?assetId=xyz  -> tietyn koneen huoltohistoria + tulevat huollot
router.get("/", asyncHandler(async (req, res) => {
  const all = await readAll("workorders");
  const { assetId } = req.query;
  res.json(assetId ? all.filter((w) => w.assetId === assetId) : all);
}));

router.post("/", asyncHandler(async (req, res) => {
  const item = { id: uuidv4(), ...req.body };
  await create("workorders", item);
  res.status(201).json(item);
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const updated = await update("workorders", req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Työmääräystä ei löytynyt." });
  res.json(updated);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const ok = await remove("workorders", req.params.id);
  if (!ok) return res.status(404).json({ error: "Työmääräystä ei löytynyt." });
  res.status(204).end();
}));

export default router;
