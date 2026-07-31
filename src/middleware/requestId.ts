import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
    const requestId = ( req.headers['x-request-id'] as string ) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
}