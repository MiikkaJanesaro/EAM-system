import "./setupEnv.js";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { readAll, findById, create, update, remove, getUserByUsername } from "../utils/db.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe("readAll", () => {
  test("palauttaa taulun rivit oikean taulun nimellä", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-locations" }).resolves({
      Items: [{ id: "loc1", name: "Oulun tehdas" }],
    });

    const result = await readAll("locations");
    assert.deepEqual(result, [{ id: "loc1", name: "Oulun tehdas" }]);
  });

  test("palauttaa tyhjän taulukon jos Items puuttuu", async () => {
    ddbMock.on(ScanCommand).resolves({});
    const result = await readAll("assets");
    assert.deepEqual(result, []);
  });
});

describe("findById", () => {
  test("palauttaa kohteen id:llä", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-assets", Key: { id: "a1" } })
      .resolves({ Item: { id: "a1", name: "Trukki" } });

    const result = await findById("assets", "a1");
    assert.deepEqual(result, { id: "a1", name: "Trukki" });
  });

  test("palauttaa undefined jos kohdetta ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await findById("assets", "unknown");
    assert.equal(result, undefined);
  });
});

describe("create", () => {
  test("kirjoittaa kohteen ja palauttaa sen", async () => {
    ddbMock.on(PutCommand).resolves({});
    const item = { id: "i1", name: "Uusi nimike" };
    const result = await create("inventory", item);
    assert.deepEqual(result, item);

    const call = ddbMock.commandCalls(PutCommand)[0];
    assert.equal(call.args[0].input.TableName, "eam-inventory");
    assert.deepEqual(call.args[0].input.Item, item);
  });
});

describe("update", () => {
  test("yhdistää päivitykset olemassa olevaan kohteeseen", async () => {
    ddbMock
      .on(GetCommand, { TableName: "eam-assets", Key: { id: "a1" } })
      .resolves({ Item: { id: "a1", name: "Trukki", status: "ok" } });
    ddbMock.on(PutCommand).resolves({});

    const result = await update("assets", "a1", { status: "maintenance_due" });
    assert.deepEqual(result, { id: "a1", name: "Trukki", status: "maintenance_due" });
  });

  test("palauttaa null jos kohdetta ei löydy", async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await update("assets", "unknown", { status: "ok" });
    assert.equal(result, null);
  });
});

describe("remove", () => {
  test("palauttaa true kun kohde poistettiin", async () => {
    ddbMock.on(DeleteCommand).resolves({ Attributes: { id: "a1" } });
    const result = await remove("assets", "a1");
    assert.equal(result, true);
  });

  test("palauttaa false jos kohdetta ei ollut olemassa", async () => {
    ddbMock.on(DeleteCommand).resolves({});
    const result = await remove("assets", "unknown");
    assert.equal(result, false);
  });
});

describe("getUserByUsername", () => {
  test("suodattaa käyttäjätaulua käyttäjätunnuksella", async () => {
    ddbMock.on(ScanCommand, { TableName: "eam-users" }).resolves({
      Items: [{ id: "u1", username: "admin", passwordHash: "hash" }],
    });

    const result = await getUserByUsername("admin");
    assert.equal(result.id, "u1");

    const call = ddbMock.commandCalls(ScanCommand)[0];
    assert.equal(call.args[0].input.FilterExpression, "username = :u");
    assert.deepEqual(call.args[0].input.ExpressionAttributeValues, { ":u": "admin" });
  });

  test("palauttaa undefined jos käyttäjää ei löydy", async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    const result = await getUserByUsername("tuntematon");
    assert.equal(result, undefined);
  });
});
