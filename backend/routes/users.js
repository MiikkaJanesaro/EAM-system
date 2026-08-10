import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { readAll, findById, getUserByUsername, create, update, remove } from "../utils/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function withoutPasswordHash(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function countAdmins() {
  const users = await readAll("users");
  return users.filter((u) => u.role === "admin").length;
}

router.get("/", asyncHandler(async (req, res) => {
  const users = await readAll("users");
  res.json(users.map(withoutPasswordHash));
}));

router.post("/", asyncHandler(async (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: "Käyttäjätunnus, salasana, nimi ja rooli vaaditaan." });
  }
  if (!["admin", "mechanic"].includes(role)) {
    return res.status(400).json({ error: "Rooli on oltava 'admin' tai 'mechanic'." });
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: "Käyttäjätunnus on jo käytössä." });
  }

  const user = {
    id: uuidv4(),
    username,
    name,
    role,
    passwordHash: await bcrypt.hash(password, 10),
  };
  await create("users", user);
  res.status(201).json(withoutPasswordHash(user));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { name, username, role } = req.body;

  if (role && !["admin", "mechanic"].includes(role)) {
    return res.status(400).json({ error: "Rooli on oltava 'admin' tai 'mechanic'." });
  }

  const existing = await findById("users", req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Käyttäjää ei löytynyt." });
  }

  if (username && username !== existing.username) {
    const usernameTaken = await getUserByUsername(username);
    if (usernameTaken) {
      return res.status(409).json({ error: "Käyttäjätunnus on jo käytössä." });
    }
  }

  if (role === "mechanic" && existing.role === "admin" && (await countAdmins()) <= 1) {
    return res.status(400).json({ error: "Viimeistä pääkäyttäjää ei voi muuttaa mekaanikoksi." });
  }

  const updates = {};
  if (name) updates.name = name;
  if (username) updates.username = username;
  if (role) updates.role = role;

  const updated = await update("users", req.params.id, updates);
  res.json(withoutPasswordHash(updated));
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: "Et voi poistaa omaa tiliäsi." });
  }

  const existing = await findById("users", req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Käyttäjää ei löytynyt." });
  }

  if (existing.role === "admin" && (await countAdmins()) <= 1) {
    return res.status(400).json({ error: "Viimeistä pääkäyttäjää ei voi poistaa." });
  }

  await remove("users", req.params.id);
  res.status(204).end();
}));

export default router;
