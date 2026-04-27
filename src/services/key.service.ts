import crypto from 'crypto';
import { db } from '../config/db';
import { apiKeys } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export function generateApiKey() {
    const key = `hv_${crypto.randomBytes(32).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + key).digest('hex');
    const prefix = key.slice(0, 16);
    return { key, salt, hash, prefix };
}

export function verifyApiKey(incoming: string, storedSalt: string, storedHash: string): boolean {
    const hash = crypto.createHash('sha256').update(storedSalt + incoming).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export async function createKey(userId: string, name: string) {
    const { key, salt, hash, prefix } = generateApiKey();

    const [newKey] = await db.insert(apiKeys).values({
        userId,
        keyHash: hash,
        keySalt: salt,
        keyPrefix: prefix,
        name,
    }).returning();

    //full key returned once
    return { key, id: newKey.id, prefix, name };
}

export function listKeys(userId: string) {
    return db.select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
    }).from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));
}

export async function revokeKey(userId: string, keyId: string) {
    const result = await db.update(apiKeys)
        .set({isActive: false})
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, keyId)))
        .returning();
        return result.length > 0;
}

export async function validateApiKey(incoming: string) {
    const prefix = incoming.slice(0, 16);

    const candidates = await db.select().from(apiKeys)
        .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.isActive, true)));

    for (const candidate of candidates) {
        if (verifyApiKey(incoming, candidate.keySalt, candidate.keyHash)) {
            //update the last used at
            await db.update(apiKeys)
                .set({lastUsedAt: new Date()})
                .where(eq(apiKeys.id, candidate.id))
        return { userId: candidate.userId, apiKeyId: candidate.id };
        }
    }    
    return null;
}