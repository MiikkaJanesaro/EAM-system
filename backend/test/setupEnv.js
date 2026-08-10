// Ensimmäinen import jokaisessa testitiedostossa - asettaa ympäristömuuttujat
// ennen kuin app.js/db.js ladataan, jotta testit eivät riipu kehittäjän
// omasta .env-tiedostosta.
process.env.JWT_SECRET = "test-secret";
process.env.AWS_REGION = "eu-north-1";
process.env.DYNAMODB_TABLE_PREFIX = "eam-";
process.env.CORS_ORIGIN = "http://localhost:5173";
