import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createApp } from "../app.js";

const ddbMock = mockClient(DynamoDBDocumentClient);
const app = createApp();
const token = jwt.sign({ sub: "u1", username: "mekaanikko", role: "mechanic" }, "test-secret");
const auth = (req) => req.set("Authorization", `Bearer ${token}`);

const allWorkorders = [
  { id: "w1", assetId: "a1", status: "completed" },
  { id: "w2", assetId: "a2", status: "scheduled" },
  { id: "w3", assetId: "a1", status: "overdue" },
];

beforeEach(() => {
  ddbMock.reset();
  ddbMock.on(ScanCommand, { TableName: "eam-workorders" }).resolves({ Items: allWorkorders });
});

describe("GET /api/workorders", () => {
  test("palauttaa kaikki jos assetId puuttuu", async () => {
    const res = await auth(request(app).get("/api/workorders"));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
  });

  test("suodattaa assetId:n mukaan", async () => {
    const res = await auth(request(app).get("/api/workorders?assetId=a1"));
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((w) => w.id),
      ["w1", "w3"]
    );
  });

  test("liittää presigned URL:t olemassa oleviin liitteisiin", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-workorders" }).resolves({
      Items: [
        {
          id: "w1",
          assetId: "a1",
          attachments: [{ key: "workorders/w1/kuva.jpg", filename: "kuva.jpg" }],
        },
      ],
    });
    const res = await auth(request(app).get("/api/workorders"));
    assert.equal(res.status, 200);
    assert.ok(res.body[0].attachments[0].url.startsWith("https://"));
  });
});

describe("POST /api/workorders", () => {
  test("luo työmääräyksen", async () => {
    ddbMock.on(PutCommand).resolves({});
    const res = await auth(request(app).post("/api/workorders")).send({
      assetId: "a1",
      title: "Uusi huolto",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Uusi huolto");
  });
});

describe("POST /api/workorders/:id/attachments/upload-url", () => {
  test("palauttaa presigned upload-URL:n ja avaimen", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: "w1", assetId: "a1" } });
    const res = await auth(request(app).post("/api/workorders/w1/attachments/upload-url")).send({
      filename: "kuva.jpg",
      contentType: "image/jpeg",
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.key.startsWith("workorders/w1/"));
    assert.ok(res.body.uploadUrl.startsWith("https://"));
  });

  test("palauttaa 404 jos työmääräystä ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await auth(
      request(app).post("/api/workorders/unknown/attachments/upload-url")
    ).send({ filename: "kuva.jpg", contentType: "image/jpeg" });
    assert.equal(res.status, 404);
  });

  test("palauttaa 400 puuttuvilla kentillä", async () => {
    const res = await auth(request(app).post("/api/workorders/w1/attachments/upload-url")).send(
      {}
    );
    assert.equal(res.status, 400);
  });
});

describe("POST /api/workorders/:id/attachments", () => {
  test("lisää liitteen työmääräykseen", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { id: "w1", assetId: "a1", attachments: [] } });
    ddbMock.on(PutCommand).resolves({});
    const res = await auth(request(app).post("/api/workorders/w1/attachments")).send({
      key: "workorders/w1/kuva.jpg",
      filename: "kuva.jpg",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.attachments.length, 1);
    assert.equal(res.body.attachments[0].filename, "kuva.jpg");
    assert.ok(res.body.attachments[0].url.startsWith("https://"));
  });

  test("palauttaa 404 jos työmääräystä ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await auth(request(app).post("/api/workorders/unknown/attachments")).send({
      key: "x",
      filename: "y",
    });
    assert.equal(res.status, 404);
  });
});
