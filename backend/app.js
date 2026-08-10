import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import workorderRoutes from "./routes/workorders.js";
import { crudFactory } from "./routes/crudFactory.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/assets", crudFactory("assets"));
  app.use("/api/locations", crudFactory("locations"));
  app.use("/api/inventory", crudFactory("inventory"));
  app.use("/api/workorders", workorderRoutes);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Palvelinvirhe." });
  });

  return app;
}
