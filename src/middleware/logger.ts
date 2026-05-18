import { RequestHandler } from "express";
import { userLogs } from "../db/schema";
import { db } from "../config/db";


export const loggerMiddleware: RequestHandler = (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        //st log
        const log = {
            request_id: req.requestId,
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
            duration_ms: duration,
            user_id: req.userId || null,
            timestamp: new Date().toISOString(),
        };

        console.log(JSON.stringify(log));

        //insert usage log for authenticated requests async don't block response
        if (req.userId) {
            db.insert(userLogs).values({
                userId: req.userId,
                apiKeyId: req.apiKeyId,
                requestId: req.requestId,
                action: deriveAction(req.method, req.path),
                durationMs: duration,
                statusCode: res.statusCode,
                requestIp: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',

            }).catch(err => console.error('Usage log insert failed:', err));
        }
    });

    next();
};

function deriveAction(method: string, path: string): string {
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/transform')) return 'transform';
    if (path.includes('/images') && method === 'DELETE') return 'delete';
    if (path.includes('images')) return 'image_read';
    if (path.includes('/keys')) return 'key_management';
    return 'other';
}