import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export class AppError extends Error {
    constructor (
        public statusCode: number,
        public code: string,
        message: string
    ) {
        super(message);
        this.name = "AppError";
    }
}

export const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    if(err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            request_id: req.requestId
        });
        return;
    }

    console.error(JSON.stringify({
        request_id: req.requestId,
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
    }));

    res.status(500).json({
        error: "Internal Server Error",
        code: "INTERNAL ERROR",
        request_id: req.requestId
    })
}

