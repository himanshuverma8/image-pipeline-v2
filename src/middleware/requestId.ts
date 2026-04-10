import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
    const requestId = ( req.headers['x-request-id'] as string ) || uuidv4();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
}