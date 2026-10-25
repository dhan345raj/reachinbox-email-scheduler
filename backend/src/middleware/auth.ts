import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import { JWTPayload } from '../types';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Authorization token missing or invalid' });
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (err: any) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    if (!decoded.userId) {
      res.status(401).json({ success: false, error: 'Invalid token payload' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('[AuthMiddleware] Error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

export default authMiddleware;
