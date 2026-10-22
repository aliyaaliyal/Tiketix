import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/user.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { loginSchema, registerSchema } from './auth.validator';
import { authenticate } from '../../middlewares/auth';
import { authLimiter } from '../../middlewares/rateLimiter';

const router = Router();

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);

export { router as authRoutes };
