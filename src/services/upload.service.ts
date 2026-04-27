import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX, v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import { r2, R2_BUCKET } from "../config/r2";
import { db } from "../config/db";
import { images } from "../db/schema";
import { AppError } from "../middleware/errorHandler";

const ALLOWED_TYPES = [
  "images/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const MAX_SIZE = 10 * 1024 * 1024;

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

  const imageId = uuidv4();
  const ext = path.extname(filename) || `.${contentType.split("/")[1]}`;
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
      `${length / 1024 / 1024}MB exceeds the limit`,
    );
  }
  const imageId = uuidv4();
  const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
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
