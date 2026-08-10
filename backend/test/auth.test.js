import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createApp } from "../app.js";

const ddbMock = mockClient(DynamoDBDocumentClient);
const app = createApp();

const testUser = {
  id: "u1",
  username: "admin",
  name: "Pääkäyttäjä",
  role: "admin",
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
    assert.equal(res.body.user.role, "admin");

    const payload = jwt.verify(res.body.token, "test-secret");
    assert.equal(payload.sub, "u1");
    assert.equal(payload.role, "admin");
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
    const token = jwt.sign(
      { sub: "u1", username: "admin", name: "Pääkäyttäjä", role: "admin" },
      "test-secret"
    );
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, "admin");
    assert.equal(res.body.user.role, "admin");
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

describe("PUT /api/auth/password", () => {
  const token = jwt.sign({ sub: "u1", username: "admin", role: "admin" }, "test-secret");
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  test("vaatii kirjautumisen", async () => {
    const res = await request(app)
      .put("/api/auth/password")
      .send({ currentPassword: "admin123", newPassword: "uusisalasana" });
    assert.equal(res.status, 401);
  });

  test("oikealla nykyisellä salasanalla vaihtaa salasanan", async () => {
    ddbMock.on(GetCommand, { TableName: "eam-users", Key: { id: "u1" } }).resolves({
      Item: testUser,
    });
    ddbMock.on(PutCommand).resolves({});

    const res = await auth(request(app).put("/api/auth/password")).send({
      currentPassword: "admin123",
      newPassword: "uusisalasana123",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);

    const call = ddbMock.commandCalls(PutCommand)[0];
    assert.notEqual(call.args[0].input.Item.passwordHash, testUser.passwordHash);
  });

  test("väärällä nykyisellä salasanalla palauttaa 400 (ei 401 - ei saa kirjata ulos)", async () => {
    ddbMock.on(GetCommand, { TableName: "eam-users", Key: { id: "u1" } }).resolves({
      Item: testUser,
    });
    const res = await auth(request(app).put("/api/auth/password")).send({
      currentPassword: "vaarin",
      newPassword: "uusisalasana123",
    });
    assert.equal(res.status, 400);
  });

  test("liian lyhyellä uudella salasanalla palauttaa 400", async () => {
    const res = await auth(request(app).put("/api/auth/password")).send({
      currentPassword: "admin123",
      newPassword: "lyhyt",
    });
    assert.equal(res.status, 400);
  });

  test("puuttuvilla kentillä palauttaa 400", async () => {
    const res = await auth(request(app).put("/api/auth/password")).send({
      currentPassword: "admin123",
    });
    assert.equal(res.status, 400);
  });
});
