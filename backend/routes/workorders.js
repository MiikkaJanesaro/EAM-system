import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readAll, findById, create, update, remove } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createUploadUrl, createDownloadUrl } from "../utils/s3.js";

const router = Router();
router.use(requireAuth);

async function withAttachmentUrls(workorder) {
  if (!workorder.attachments?.length) return workorder;
  const attachments = await Promise.all(
    workorder.attachments.map(async (a) => ({ ...a, url: await createDownloadUrl(a.key) }))
  );
  return { ...workorder, attachments };
}

// GET /api/workorders?assetId=xyz  -> tietyn koneen huoltohistoria + tulevat huollot
router.get("/", asyncHandler(async (req, res) => {
  const all = await readAll("workorders");
  const { assetId } = req.query;
  const filtered = assetId ? all.filter((w) => w.assetId === assetId) : all;
  res.json(await Promise.all(filtered.map(withAttachmentUrls)));
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

// Liitteet (esim. valokuvat huoltotöistä) - kaksivaiheinen lataus:
// 1) pyydä presigned upload-URL, 2) lataa tiedosto suoraan S3:aan selaimesta,
// 3) kerro backendille että tiedosto on ladattu, jotta se tallentuu työmääräykseen.
router.post("/:id/attachments/upload-url", asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    return res.status(400).json({ error: "filename ja contentType vaaditaan." });
  }
  const workorder = await findById("workorders", req.params.id);
  if (!workorder) return res.status(404).json({ error: "Työmääräystä ei löytynyt." });

  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `workorders/${req.params.id}/${uuidv4()}-${safeName}`;
  const uploadUrl = await createUploadUrl(key, contentType);
  res.json({ key, uploadUrl });
}));

router.post("/:id/attachments", asyncHandler(async (req, res) => {
  const { key, filename } = req.body;
  if (!key || !filename) {
    return res.status(400).json({ error: "key ja filename vaaditaan." });
  }
  const workorder = await findById("workorders", req.params.id);
  if (!workorder) return res.status(404).json({ error: "Työmääräystä ei löytynyt." });

  const attachments = [
    ...(workorder.attachments || []),
    { key, filename, uploadedAt: new Date().toISOString() },
  ];
  const updated = await update("workorders", req.params.id, { attachments });
  res.status(201).json(await withAttachmentUrls(updated));
}));

export default router;
