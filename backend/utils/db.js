// AWS DynamoDB -pohjainen tietovarastokerros.
//
// Kaikki routet käyttävät vain alla olevia funktioita (readAll, findById,
// create, update, remove, getUserByUsername), joten tietovaraston vaihto ei
// vaadi reittien muokkausta - vain tämän tiedoston sisältöä.
//
// Yksi DynamoDB-taulu per kokoelma (eam-users, eam-locations, eam-assets,
// eam-inventory, eam-workorders), osiointiavaimena "id". Tunnistautuminen
// tapahtuu IAM:lla (AWS_PROFILE / AWS_REGION .env-tiedostosta) - ei erillistä
// tietokantasalasanaa hallittavaksi.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "eam-";
const tableName = (collection) => `${TABLE_PREFIX}${collection}`;

export async function readAll(collection) {
  const out = await doc.send(new ScanCommand({ TableName: tableName(collection) }));
  return out.Items || [];
}

export async function findById(collection, id) {
  const out = await doc.send(
    new GetCommand({ TableName: tableName(collection), Key: { id } })
  );
  return out.Item || undefined;
}

export async function create(collection, item) {
  await doc.send(new PutCommand({ TableName: tableName(collection), Item: item }));
  return item;
}

export async function update(collection, id, updates) {
  const existing = await findById(collection, id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, id };
  await doc.send(new PutCommand({ TableName: tableName(collection), Item: merged }));
  return merged;
}

export async function remove(collection, id) {
  const out = await doc.send(
    new DeleteCommand({
      TableName: tableName(collection),
      Key: { id },
      ReturnValues: "ALL_OLD",
    })
  );
  return Boolean(out.Attributes);
}

export async function getUserByUsername(username) {
  const out = await doc.send(
    new ScanCommand({
      TableName: tableName("users"),
      FilterExpression: "username = :u",
      ExpressionAttributeValues: { ":u": username },
    })
  );
  return (out.Items || [])[0];
}
