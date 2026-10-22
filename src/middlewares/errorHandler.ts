import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../common/errors';
import { sendError } from '../common/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // SEC-06: translate Multer upload errors into proper 4xx instead of 500.
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'Ukuran file melebihi batas 5MB.', 413, {
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 'Jumlah atau field file tidak valid. Harap upload 1 file poster.', 400, {
        code: 'INVALID_FILE_UPLOAD',
      });
    }
    return sendError(res, 'Gagal mengunggah file.', 400, { code: err.code });
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('💥 Unhandled Exception:', err);
  }

  // Handle Prisma unique constraint violation error
  if ((err as any).code === 'P2002') {
    const fields = (err as any).meta?.target;
    return sendError(res, `A record with this ${fields} already exists`, 409, {
      code: 'DUPLICATE_ENTRY',
      target: fields,
    });
  }

  // Handle Prisma record not found error
  if ((err as any).code === 'P2025') {
    return sendError(res, 'Record not found in database', 404);
  }

  // Handle Prisma constraint violation (P2004) & Postgres check constraint violation (23514)
  if (
    (err as any).code === 'P2004' ||
    (err as any).code === '23514' ||
    (err as any).meta?.database_error?.includes('23514') ||
    err.message?.toLowerCase().includes('available_quota') ||
    err.message?.toLowerCase().includes('check constraint')
  ) {
    return sendError(
      res,
      'Kuota tiket untuk tier ini tidak mencukupi atau telah habis dipesan orang lain.',
      400,
      { code: 'INSUFFICIENT_QUOTA' }
    );
  }

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
};
