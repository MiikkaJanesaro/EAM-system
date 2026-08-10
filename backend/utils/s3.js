// S3-liitteet (esim. huoltotöiden valokuvat). Kova ei-julkinen bucket -
// selain lataa/lukee tiedostot väliaikaisilla presigned-URL:eilla, ei
// koskaan suoraan backendin kautta eikä julkisen bucket-käytännön kautta.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ region: process.env.AWS_REGION });
const UPLOAD_URL_EXPIRY_SECONDS = 300;

function requireBucket() {
  if (!process.env.S3_BUCKET) {
    throw new Error(
      "S3_BUCKET ei ole asetettu .env:iin - liitteet eivät ole vielä käytössä."
    );
  }
  return process.env.S3_BUCKET;
}

export async function createUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: requireBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function createDownloadUrl(key) {
  const command = new GetObjectCommand({ Bucket: requireBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

export async function deleteObject(key) {
  await client.send(new DeleteObjectCommand({ Bucket: requireBucket(), Key: key }));
}
