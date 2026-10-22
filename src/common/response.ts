import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200, meta?: unknown) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta !== undefined ? { meta } : {}),
  });
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

export function sendError(res: Response, message: string, statusCode = 500, error?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
}
