import type { Request, Response, NextFunction } from "express";
import { adminApiToken } from "../config.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = adminApiToken();
  if (!token) {
    next();
    return;
  }
  const hdr = req.headers.authorization;
  const expected = `Bearer ${token}`;
  if (hdr !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
