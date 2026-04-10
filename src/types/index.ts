import 'express';

declare module 'express' {
    interface Request {
        requestId: string;
        userId?: string;
        apiKeyId?: string;
    }
}