import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id =
    (typeof req.headers["x-request-id"] === "string" &&
      req.headers["x-request-id"].trim()) ||
    randomUUID();
  req.correlationId = id;
  res.setHeader("x-request-id", id);
  next();
}
