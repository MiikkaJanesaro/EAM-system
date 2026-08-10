import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readAll, findById, create, update, remove } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Luo CRUD-reitit (GET-lista, GET-yksi, POST, PUT, DELETE) annetulle kokoelmalle.
// Käytetään assets/locations/inventory -reiteissä, jotta jokaista ei tarvitse
// kirjoittaa erikseen. Työmääräyksillä (workorders) on oma reittinsä, koska ne
// suodatetaan konekohtaisesti.
export function crudFactory(collection) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", asyncHandler(async (req, res) => {
    res.json(await readAll(collection));
  }));

  router.get("/:id", asyncHandler(async (req, res) => {
    const item = await findById(collection, req.params.id);
    if (!item) return res.status(404).json({ error: "Kohdetta ei löytynyt." });
    res.json(item);
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const item = { id: uuidv4(), ...req.body };
    await create(collection, item);
    res.status(201).json(item);
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const updated = await update(collection, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Kohdetta ei löytynyt." });
    res.json(updated);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const ok = await remove(collection, req.params.id);
    if (!ok) return res.status(404).json({ error: "Kohdetta ei löytynyt." });
    res.status(204).end();
  }));

  return router;
}
