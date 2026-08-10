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
const token = jwt.sign({ sub: "u1", username: "admin" }, "test-secret");
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
