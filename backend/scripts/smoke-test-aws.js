// Valinnainen "oikea AWS" -tarkistus - EI osa `npm test`:iä.
// Tekee todellisen kirjoitus/luku/poisto-kierroksen eam-locations-tauluun
// käyttäen .env:n AWS-tunnuksia, jotta yhteys DynamoDB:hen voidaan varmistaa.
// Aja: npm run test:aws
import "dotenv/config";
import { randomUUID } from "crypto";
import { create, findById, remove } from "../utils/db.js";

async function main() {
  console.log(`Alue: ${process.env.AWS_REGION}, profiili: ${process.env.AWS_PROFILE}`);

  const testItem = { id: `smoke-test-${randomUUID()}`, name: "AWS-yhteystesti" };

  console.log("Kirjoitetaan testirivi eam-locations-tauluun...");
  await create("locations", testItem);

  console.log("Luetaan se takaisin...");
  const found = await findById("locations", testItem.id);
  if (!found || found.name !== testItem.name) {
    throw new Error("Luku ei palauttanut juuri kirjoitettua riviä.");
  }

  console.log("Poistetaan testirivi...");
  const removed = await remove("locations", testItem.id);
  if (!removed) {
    throw new Error("Poisto ei onnistunut - testirivi voi jäädä roikkumaan tauluun.");
  }

  console.log("OK - DynamoDB-yhteys toimii ja oikeudet (luku/kirjoitus/poisto) ovat kunnossa.");
}

main().catch((err) => {
  console.error("Smoke-testi epäonnistui:", err);
  process.exit(1);
});
