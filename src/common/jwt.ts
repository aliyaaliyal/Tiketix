import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types/express';
import { UnauthorizedError } from './errors';

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired. Please log in again.');
    }
    throw new UnauthorizedError('Invalid or corrupted authentication token.');
  }
}
