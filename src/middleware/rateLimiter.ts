import { Request, Response, NextFunction } from "express";
import { userLogs } from "../db/schema";
import { db } from "../config/db";
import { eq, and, gt, count } from "drizzle-orm";
import { AppError } from "./errorHandler";


const RATE_LIMIT = 100; //100 req/min
const WINDOW_MS = 60 * 1000; //1min

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    if (!req.apiKeyId) return next();

    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [{ requestCount }] = await
        db.select({ requestCount: count() })
        .from(userLogs)
        .where(and(
            eq(userLogs.apiKeyId, req.apiKeyId),
            gt(userLogs.timestamp, windowStart)
        ));

    const remaining = Math.max(0, RATE_LIMIT - requestCount);
    const resetTime = Math.ceil((Date.now() + WINDOW_MS)/1000);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (requestCount >= RATE_LIMIT) {
        throw new AppError(429, 'RATE_LIMITED', 'Too many requests');
    }
    next();
}
