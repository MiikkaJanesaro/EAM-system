// Ensimmäinen import jokaisessa testitiedostossa - asettaa ympäristömuuttujat
// ennen kuin app.js/db.js ladataan, jotta testit eivät riipu kehittäjän
// omasta .env-tiedostosta.
process.env.JWT_SECRET = "test-secret";
process.env.AWS_REGION = "eu-north-1";
process.env.DYNAMODB_TABLE_PREFIX = "eam-";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.S3_BUCKET = "test-bucket";
// Presigned URL:n allekirjoitus on paikallinen laskutoimitus - ei tarvitse
// oikeita AWS-tunnuksia, mutta credential-ketju pitää saada ratkaistua.
process.env.AWS_ACCESS_KEY_ID = "test-access-key-id";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-access-key";
