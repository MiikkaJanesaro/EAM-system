// Kertaluontoinen migraatio: lataa backend/db.json:n sisällön DynamoDB-tauluihin.
// Aja: node scripts/migrate-to-dynamodb.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "..", "db.json");
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "eam-";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const doc = DynamoDBDocumentClient.from(client);

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function migrateCollection(collection, items) {
  if (!items.length) {
    console.log(`${collection}: ei rivejä, ohitetaan`);
    return;
  }
  const tableName = `${TABLE_PREFIX}${collection}`;
  for (const batch of chunk(items, 25)) {
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((Item) => ({ PutRequest: { Item } })),
        },
      })
    );
  }
  console.log(`${collection}: ${items.length} riviä -> ${tableName}`);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  for (const collection of Object.keys(data)) {
    await migrateCollection(collection, data[collection]);
  }
  console.log("Migraatio valmis.");
}

main().catch((err) => {
  console.error("Migraatio epäonnistui:", err);
  process.exit(1);
});
