import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createApp } from "../app.js";

const ddbMock = mockClient(DynamoDBDocumentClient);
const app = createApp();
const adminToken = jwt.sign({ sub: "u1", username: "admin", role: "admin" }, "test-secret");
const mechanicToken = jwt.sign({ sub: "u2", username: "mekaanikko", role: "mechanic" }, "test-secret");
const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);
const asMechanic = (req) => req.set("Authorization", `Bearer ${mechanicToken}`);

beforeEach(() => {
  ddbMock.reset();
});

describe("GET /api/users", () => {
  test("mekaanikko ei pääse käsiksi (403)", async () => {
    const res = await asMechanic(request(app).get("/api/users"));
    assert.equal(res.status, 403);
  });

  test("admin näkee käyttäjät ilman passwordHashia", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u1", username: "admin", role: "admin", passwordHash: "salaisuus" }],
    });
    const res = await asAdmin(request(app).get("/api/users"));
    assert.equal(res.status, 200);
    assert.equal(res.body[0].passwordHash, undefined);
    assert.equal(res.body[0].username, "admin");
  });
});

describe("POST /api/users", () => {
  test("mekaanikko ei saa luoda käyttäjiä (403)", async () => {
    const res = await asMechanic(request(app).post("/api/users")).send({
      username: "uusi",
      password: "salasana123",
      name: "Uusi Mekaanikko",
      role: "mechanic",
    });
    assert.equal(res.status, 403);
  });

  test("admin voi luoda uuden mekaanikon", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({ Items: [] });
    ddbMock.on(PutCommand).resolves({});

    const res = await asAdmin(request(app).post("/api/users")).send({
      username: "mekaanikko1",
      password: "salasana123",
      name: "Matti Mekaanikko",
      role: "mechanic",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.username, "mekaanikko1");
    assert.equal(res.body.role, "mechanic");
    assert.equal(res.body.passwordHash, undefined);
  });

  test("palauttaa 409 jos käyttäjätunnus on jo käytössä", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u1", username: "admin" }],
    });
    const res = await asAdmin(request(app).post("/api/users")).send({
      username: "admin",
      password: "salasana123",
      name: "Toinen Admin",
      role: "admin",
    });
    assert.equal(res.status, 409);
  });

  test("palauttaa 400 kelvottomalla roolilla", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({ Items: [] });
    const res = await asAdmin(request(app).post("/api/users")).send({
      username: "joku",
      password: "salasana123",
      name: "Joku",
      role: "supervisor",
    });
    assert.equal(res.status, 400);
  });

  test("palauttaa 400 puuttuvilla kentillä", async () => {
    const res = await asAdmin(request(app).post("/api/users")).send({ username: "joku" });
    assert.equal(res.status, 400);
  });
});
