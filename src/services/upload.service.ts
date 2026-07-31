import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import sharp from "sharp";
import path from "path";
import { r2, R2_BUCKET } from "../config/r2";
import { db } from "../config/db";
import { images, users } from "../db/schema";
import { AppError } from "../middleware/errorHandler";
import { eq, sum } from "drizzle-orm";
import { env } from "../config/env";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const MAX_SIZE = 10 * 1024 * 1024;

async function checkStorageLimit(userId: string, newSize: number) {
    const [[{ storageLimit }], [{ usage }], [{ totalUsage }]] = await Promise.all([
        db.select({ storageLimit: users.storageLimit }).from(users).where(eq(users.id, userId)),
        db.select({ usage: sum(images.sizeBytes) }).from(images).where(eq(images.userId, userId)),
        db.select({ totalUsage: sum(images.sizeBytes) }).from(images),
    ]);

    if (Number(totalUsage) + newSize > env.R2_TOTAL_LIMIT) {
        throw new AppError(507, 'STORAGE_FULL', 'Service storage limit reached');
    }

    if (Number(usage) + newSize > Number(storageLimit)) {
        throw new AppError(403, 'STORAGE_LIMIT_EXCEEDED', 'Storage limit reached');
    }
}



export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string,
  size: number,
) {
  //validation checks
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `${contentType} Not Supported. Allowed Types: ${ALLOWED_TYPES.join(", ")}`,
    );
  }

  if (size > MAX_SIZE) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `${size / 1024 / 1024}MB exceeds the limit`,
    );
  }

  await checkStorageLimit(userId, size);


  const imageId = randomUUID();
  const rawExt = path.extname(filename).split('?')[0].toLowerCase();
  const ext = rawExt === '.jpg' ? '.jpeg' : rawExt || `.${contentType.split('/')[1]?.split(';')[0]}` || '.jpeg';
  const r2Key = `originals/${userId}/${imageId}${ext}`;
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 300 },
  );

  const [image] = await db
    .insert(images)
    .values({
      id: imageId,
      userId,
      originalKey: r2Key,
      filename,
      contentType,
      sizeBytes: size,
    })
    .returning();

  return { upload_url: uploadUrl, image_id: image.id, r2_key: r2Key };
}

export async function uploadFromUrl(userId: string, url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `Failed to fetch the image ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!ALLOWED_TYPES.includes(contentType.split(";")[0])) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `${contentType} Not Supported. Allowed Types: ${ALLOWED_TYPES.join(", ")}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SIZE) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `${buffer.length / 1024 / 1024}MB exceeds the limit`,
    );
  }

  await checkStorageLimit(userId, buffer.length);


  const imageId = randomUUID();
  const ext = contentType.split("/")[1]?.split(";")[0] || "jpeg";
  const r2Key = `originals/${userId}/${imageId}.${ext}`;

  //get the dimensions
  let width: number | undefined, height: number | undefined;
  try {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width;
    height = metadata.height;
  } catch (error) {}

  //upload to r2
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const [image] = await db
    .insert(images)
    .values({
      id: imageId,
      userId,
      originalKey: r2Key,
      filename: url.split("/").pop() || `image.${ext}`,
      contentType,
      sizeBytes: buffer.length,
      width,
      height,
    })
    .returning();

  return {
    image_id: image.id,
    r2_key: image.originalKey,
    size_bytes: buffer.length,
    width,
    height,
  };
}
