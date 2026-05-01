import { db } from "../config/db";
import { images, transformations } from "../db/schema";
import { eq, and, desc, asc, ilike, count } from "drizzle-orm";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET, r2 } from "../config/r2";
import { AppError } from "../middleware/errorHandler";

interface ListOptions {
    page: number;
    limit: number;
    search?: string;
    format?: string;
    sort?: 'newest' | 'oldest';
}

export async function listImages(userId: string, opts: ListOptions) {

    const {page = 1, limit = 20, search, format, sort = 'newest'} = opts;
    const conditions = [eq(images.userId, userId)];
    if (search) conditions.push(ilike(images.filename, `%${search}%`));
    if (format) conditions.push(eq(images.contentType, `image/${format}`));
    const where = and(...conditions);

    const [imageList, [{ total }]] = await Promise.all([
        db.select().from(images)
            .where(where)
            .orderBy(sort === 'newest' ? desc(images.uploadedAt) : asc(images.uploadedAt))
            .limit(limit)
            .offset((page - 1) * limit),
            db.select({ total: count()}).from(images).where(where),
    ]);

    return { images: imageList, total, page, pages: Math.ceil(total / limit)};
}

export async function getImage(userId: string, ImageId: string) {
    const [image] = await db.select().from(images)
        .where(and(eq(images.userId, userId), eq(images.id, ImageId)));

    if (!image) {
        throw new AppError(404, 'NOT_FOUND', "Image not found");
    }    

    const transforms = await db.select().from(transformations)
        .where(eq(transformations.imageId, ImageId));

    return { image, transformations: transforms}
}

export async function updateImage(userId: string, imageId: string, data: { tags?: string[]; filename?: string } ) {
    const [updated] = await db.update(images)
        .set(data)
        .where(and(eq(images.id, imageId), eq(images.userId, userId)))
        .returning();
    
    if (!updated) {
        throw new AppError(404, 'NOT_FOUND', 'Image not found');
    }
    return updated;
}

export async function deleteImage(userId: string, imageId: string) {
    const [image] = await db.select().from(images)
        .where(and(eq(images.id, imageId), eq(images.userId, userId)));

    if(!image) throw new AppError(404, 'NOT_FOUND', 'Image not found');

    const transforms = await db.select({ key: transformations.transformedKey}).from(transformations).where(eq(transformations.imageId, imageId));

    //atomic db delete
    await db.transaction(async (tx) => {
        await tx.delete(transformations).where(eq(transformations.imageId,  imageId))
        await tx.delete(images).where(eq(images.id, imageId))
    })

    // delete it from r2
    try {
        const keys = [image.originalKey, ...transforms.map(t => t.key)]
        if (keys.length > 0) {
            await r2.send(new DeleteObjectsCommand({
                Bucket: R2_BUCKET,
                Delete: { Objects: keys.map(Key => ( { Key } )) }
            }))
        }
    } catch (err) {
        console.error(JSON.stringify({ action: 'r2_delete_failed', imageId, error: (err as Error).message }));
    }
}