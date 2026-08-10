import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { createApp } from "../app.js";

// crudFactory("assets"/"locations"/"inventory") on identtinen kaikille kolmelle
// - testataan /api/assets:in kautta, kattaa myös muut.

const ddbMock = mockClient(DynamoDBDocumentClient);
const app = createApp();
const token = jwt.sign({ sub: "u1", username: "admin", role: "admin" }, "test-secret");
const mechanicToken = jwt.sign({ sub: "u2", username: "mekaanikko", role: "mechanic" }, "test-secret");
const auth = (req) => req.set("Authorization", `Bearer ${token}`);
const mechanicAuth = (req) => req.set("Authorization", `Bearer ${mechanicToken}`);

beforeEach(() => {
  ddbMock.reset();
});

describe("GET /api/assets", () => {
  test("vaatii kirjautumisen", async () => {
    const res = await request(app).get("/api/assets");
    assert.equal(res.status, 401);
  });

  test("palauttaa listan kirjautuneena", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-assets" }).resolves({
      Items: [{ id: "a1", name: "Trukki" }],
    });
    const res = await auth(request(app).get("/api/assets"));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [{ id: "a1", name: "Trukki" }]);
  });

  test("mekaanikko saa myös listata", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-assets" }).resolves({
      Items: [{ id: "a1", name: "Trukki" }],
    });
    const res = await mechanicAuth(request(app).get("/api/assets"));
    assert.equal(res.status, 200);
  });
});

describe("GET /api/assets/:id", () => {
  test("palauttaa 404 jos kohdetta ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await auth(request(app).get("/api/assets/unknown"));
    assert.equal(res.status, 404);
  });

  test("palauttaa kohteen jos se löytyy", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: "a1", name: "Trukki" } });
    const res = await auth(request(app).get("/api/assets/a1"));
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "Trukki");
  });
});

describe("POST /api/assets", () => {
  test("luo kohteen ja palauttaa 201 adminina", async () => {
    ddbMock.on(PutCommand).resolves({});
    const res = await auth(request(app).post("/api/assets")).send({ name: "Uusi kone" });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "Uusi kone");
    assert.ok(res.body.id);
  });

  test("mekaanikko ei saa luoda työkonetta (403)", async () => {
    const res = await mechanicAuth(request(app).post("/api/assets")).send({ name: "Uusi kone" });
    assert.equal(res.status, 403);
  });
});

describe("PUT /api/assets/:id", () => {
  test("palauttaa 404 jos kohdetta ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await auth(request(app).put("/api/assets/unknown")).send({ status: "ok" });
    assert.equal(res.status, 404);
  });

  test("päivittää kohteen", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: "a1", status: "overdue" } });
    ddbMock.on(PutCommand).resolves({});
    const res = await auth(request(app).put("/api/assets/a1")).send({ status: "ok" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  test("mekaanikko ei saa päivittää työkonetta (403)", async () => {
    const res = await mechanicAuth(request(app).put("/api/assets/a1")).send({ status: "ok" });
    assert.equal(res.status, 403);
  });
});

describe("DELETE /api/assets/:id", () => {
  test("palauttaa 204 kun kohde poistettiin", async () => {
    ddbMock.on(DeleteCommand).resolves({ Attributes: { id: "a1" } });
    const res = await auth(request(app).delete("/api/assets/a1"));
    assert.equal(res.status, 204);
  });

  test("palauttaa 404 jos kohdetta ei ollut", async () => {
    ddbMock.on(DeleteCommand).resolves({});
    const res = await auth(request(app).delete("/api/assets/unknown"));
    assert.equal(res.status, 404);
  });

  test("mekaanikko ei saa poistaa työkonetta (403)", async () => {
    const res = await mechanicAuth(request(app).delete("/api/assets/a1"));
    assert.equal(res.status, 403);
  });
});
