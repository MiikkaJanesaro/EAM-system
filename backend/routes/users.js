import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { readAll, getUserByUsername, create } from "../utils/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function withoutPasswordHash(user) {
  const { passwordHash, ...rest } = user;
  return rest;
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

export default router;
