import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createApp } from "../app.js";

const ddbMock = mockClient(DynamoDBDocumentClient);
const app = createApp();

const testUser = {
  id: "u1",
  username: "admin",
  name: "Pääkäyttäjä",
  passwordHash: bcrypt.hashSync("admin123", 10),
};

beforeEach(() => {
  ddbMock.reset();
  ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({ Items: [testUser] });
});

describe("POST /api/auth/login", () => {
  test("oikeilla tunnuksilla palauttaa tokenin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, "admin");

    const payload = jwt.verify(res.body.token, "test-secret");
    assert.equal(payload.sub, "u1");
  });

  test("väärällä salasanalla palauttaa 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "vaarin" });
    assert.equal(res.status, 401);
  });

  test("tuntemattomalla käyttäjällä palauttaa 401", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({ Items: [] });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "tuntematon", password: "mitavain" });
    assert.equal(res.status, 401);
  });

  test("puuttuvilla kentillä palauttaa 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin" });
    assert.equal(res.status, 400);
  });
});

describe("GET /api/auth/me", () => {
  test("kelvollisella tokenilla palauttaa käyttäjän", async () => {
    const token = jwt.sign({ sub: "u1", username: "admin", name: "Pääkäyttäjä" }, "test-secret");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, "admin");
  });

  test("ilman tokenia palauttaa 401", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
  });

  test("virheellisellä tokenilla palauttaa 401", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer roskaa");
    assert.equal(res.status, 401);
  });
});
