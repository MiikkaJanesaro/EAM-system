import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Kirjautuminen vaaditaan." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Istunto on vanhentunut. Kirjaudu uudelleen." });
  }
}

// Käytetään requireAuthin jälkeen - rajaa reitin tietyille rooleille
// (esim. requireRole("admin") sallii vain pääkäyttäjät).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Ei oikeuksia tähän toimintoon." });
    }
    next();
  };
}
