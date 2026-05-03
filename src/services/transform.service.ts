import { db } from '../config/db';
import { transformations, images } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { transformParamsSchema } from '../lib/paramParser';
import { hashParams } from '../lib/paramHash';
import { invokeTransformLambda } from '../lib/lambda';
import { R2_PUBLIC_URL } from '../config/r2';
import { AppError } from '../middleware/errorHandler'; 

export async function transformImage(
    userId: string, imageId: string, rawParams: Record<string, unknown>, requestId: string
) {
    //validate params
    const parsed = transformParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
        throw new AppError(400, 'BAD_REQUEST', `Invalid params: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const params = parsed.data;

    //verify if image exists and belongs to user 
    const [image] = await db.select().from(images)
        .where(and(eq(images.id, imageId), eq(images.userId, userId)));
    if (!image) {
        throw new AppError(404, 'NOT_FOUND', 'Image Not Found');
    }    

    //check cache db layer
    const paramsHash = hashParams(params);
    const [cached] = await db.select().from(transformations)
        .where(and(eq(transformations.imageId, imageId), eq(transformations.paramsHash, paramsHash)));
    // cache hit
    if (cached) {
        return {cdn_url: cached.cdnUrl, cached: true, processing_time: 0}
    }

    //cachem miss
    //-> invoke the lambda to process the image based on requested transformations params using sharp -> r2 store -> cdn serve
    const ext = params.fmt || image.contentType.split('/')[1] || 'jpg';
    const outputkey = `transformed/${userId}/${paramsHash}/${imageId}.${ext}`;
    const cdnUrl = `${R2_PUBLIC_URL}/${outputkey}`;

    const result = await invokeTransformLambda({
        r2_key: image.originalKey,
        params,
        request_id: requestId,
        user_id: userId,
        output_key: outputkey

    });

    //save to cache
    await db.insert(transformations).values({
        imageId,
        userId,
        paramsHash,
        transformedKey: result.transformed_key,
        cdnUrl,
        params,
        outputSizeBytes: result.output_size,
        processingTimeMs: result.processing_time_ms,
    })


    return { cdn_url: cdnUrl, cached: false, processing_time_ms: result.processing_time_ms };

}

export async function listTransformations(userId: string, imageId: string) {
    //if image exists nor not
    const [image] = await db.select().from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)));
  if (!image) throw new AppError(404, 'NOT_FOUND', 'Image not found');

  return db.select({
    params: transformations.params,
    cdnUrl: transformations.cdnUrl,
    outputSizeBytes: transformations.outputSizeBytes,
    processingTimeMs: transformations.processingTimeMs,
    createdAt: transformations.createdAt,
  }).from(transformations).where(eq(transformations.imageId, imageId));
}