import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByUsername, findById, update } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Käyttäjätunnus ja salasana vaaditaan." });
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Väärä käyttäjätunnus tai salasana." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Väärä käyttäjätunnus tai salasana." });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
}));

// Palauttaa kirjautuneen käyttäjän tiedot - frontend käyttää tätä sivun latauksessa
router.get("/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Ei kirjautunut." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      user: { id: payload.sub, username: payload.username, name: payload.name, role: payload.role },
    });
  } catch {
    res.status(401).json({ error: "Istunto on vanhentunut." });
  }
});

// Kirjautuneen käyttäjän oman salasanan vaihto - vaatii nykyisen salasanan.
router.put("/password", requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Nykyinen ja uusi salasana vaaditaan." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Uuden salasanan on oltava vähintään 8 merkkiä." });
  }

  const user = await findById("users", req.user.sub);
  if (!user) {
    return res.status(404).json({ error: "Käyttäjää ei löytynyt." });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: "Nykyinen salasana on väärä." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await update("users", user.id, { passwordHash });
  res.json({ ok: true });
}));

export default router;
