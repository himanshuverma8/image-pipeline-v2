import { RequestHandler } from "express";
import { AppError } from "./errorHandler";

export const sessionAuth: RequestHandler = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Login Required");
    }
    req.userId = (req.user as any).id;
    next();
  } catch (err) {
    next(err);
  }
};
