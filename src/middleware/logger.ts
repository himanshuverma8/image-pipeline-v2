import { RequestHandler } from "express";

export const loggerMiddleware: RequestHandler = (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const log = {
            request_id: req.requestId,
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
            duration_ms: Date.now() - start,
            user_id: req.userId || null,
            timestamp: new Date().toISOString(),
        };

        console.log(JSON.stringify(log));
    });

    next();
};