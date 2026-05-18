import { Response, Request, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { validateApiKey } from "../services/key.service";

export async function flexAuth(req: Request, _res: Response, next: NextFunction) {

    //session auth 
    if (req.user) {
      req.userId = (req.user as any).id;
      next();
    } else {
         //apiKeyAuth
    
        const authHeader = req.headers.authorization;
        
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new AppError(401, 'UNAUTHORIZED', 'Missing or Invalid Authorization Header');
            }
           
        
            const key = authHeader.slice(7);
            if (!key.startsWith('hv')) {
                throw new AppError(401, 'UNAUTHORIZED', 'Invalid Api Key Format');
            }
        
            const result = await validateApiKey(key);
            if (!result) {
                throw new AppError(401, 'UNAUTHORIZED', 'Invalid API Key');
            }
            req.userId = result.userId;
            req.apiKeyId = result.apiKeyId;
            next();
    }
    
  
}