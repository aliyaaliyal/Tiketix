import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { BadRequestError } from '../common/errors';

// Ensure uploads/posters directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'posters');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `poster-${uniqueSuffix}${ext}`);
  },
});

// File type validator (whitelist: JPEG, PNG, WEBP)
// SEC-06: validate BOTH mimetype and extension, and reject double
// extensions (e.g. `exploit.php.jpg`) which are a classic upload-spoof trick.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, ext);
  // Reject names containing extra dots/extensions: "shell.php.jpg", ".htaccess.png", etc.
  const hasDoubleExtension =
    baseName.includes('.') || file.originalname.toLowerCase().split('.').length > 2;

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext) || hasDoubleExtension) {
    cb(new BadRequestError('Format file tidak didukung. Harap upload gambar berformat JPG, PNG, atau WebP.'));
    return;
  }
  cb(null, true);
};

// Multer upload middleware (5MB limit)
export const uploadPosterMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});
