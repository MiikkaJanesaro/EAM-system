import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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

describe("PUT /api/users/:id", () => {
  test("mekaanikko ei saa muokata käyttäjiä (403)", async () => {
    const res = await asMechanic(request(app).put("/api/users/u2")).send({ name: "Uusi Nimi" });
    assert.equal(res.status, 403);
  });

  test("palauttaa 404 jos käyttäjää ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await asAdmin(request(app).put("/api/users/unknown")).send({ name: "X" });
    assert.equal(res.status, 404);
  });

  test("päivittää nimen, käyttäjätunnuksen ja roolin", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-users", Key: { id: "u2" } })
      .resolves({ Item: { id: "u2", username: "mekaanikko", name: "Vanha Nimi", role: "mechanic" } });
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({ Items: [] });
    ddbMock.on(PutCommand).resolves({});

    const res = await asAdmin(request(app).put("/api/users/u2")).send({
      name: "Uusi Nimi",
      username: "uusitunnus",
      role: "admin",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "Uusi Nimi");
    assert.equal(res.body.username, "uusitunnus");
    assert.equal(res.body.role, "admin");
    assert.equal(res.body.passwordHash, undefined);
  });

  test("palauttaa 409 jos uusi käyttäjätunnus on jo toisella käyttäjällä", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-users", Key: { id: "u2" } })
      .resolves({ Item: { id: "u2", username: "mekaanikko", role: "mechanic" } });
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u1", username: "admin" }],
    });

    const res = await asAdmin(request(app).put("/api/users/u2")).send({ username: "admin" });
    assert.equal(res.status, 409);
  });

  test("palauttaa 400 kelvottomalla roolilla", async () => {
    const res = await asAdmin(request(app).put("/api/users/u2")).send({ role: "supervisor" });
    assert.equal(res.status, 400);
  });

  test("ei voi muuttaa viimeistä pääkäyttäjää mekaanikoksi", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-users", Key: { id: "u1" } })
      .resolves({ Item: { id: "u1", username: "admin", role: "admin" } });
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u1", username: "admin", role: "admin" }],
    });

    const res = await asAdmin(request(app).put("/api/users/u1")).send({ role: "mechanic" });
    assert.equal(res.status, 400);
  });
});

describe("DELETE /api/users/:id", () => {
  test("mekaanikko ei saa poistaa käyttäjiä (403)", async () => {
    const res = await asMechanic(request(app).delete("/api/users/u1"));
    assert.equal(res.status, 403);
  });

  test("admin ei voi poistaa omaa tiliään", async () => {
    const res = await asAdmin(request(app).delete("/api/users/u1"));
    assert.equal(res.status, 400);
  });

  test("palauttaa 404 jos käyttäjää ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await asAdmin(request(app).delete("/api/users/unknown"));
    assert.equal(res.status, 404);
  });

  test("ei voi poistaa viimeistä pääkäyttäjää", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-users", Key: { id: "u3" } })
      .resolves({ Item: { id: "u3", username: "toinenadmin", role: "admin" } });
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u3", username: "toinenadmin", role: "admin" }],
    });

    const res = await asAdmin(request(app).delete("/api/users/u3"));
    assert.equal(res.status, 400);
  });

  test("poistaa mekaanikon", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-users", Key: { id: "u2" } })
      .resolves({ Item: { id: "u2", username: "mekaanikko", role: "mechanic" } });
    ddbMock.on(DeleteCommand).resolves({ Attributes: { id: "u2" } });

    const res = await asAdmin(request(app).delete("/api/users/u2"));
    assert.equal(res.status, 204);
  });
});
