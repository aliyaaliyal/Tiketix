import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { userIdParamSchema } from './user.validator';

const router = Router();

// Dependency Injection setup
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// User profile & administration endpoints (Authentication registration is consolidated in /api/v1/auth)
router.get('/', authenticate, requireRoles(UserRole.ADMIN), userController.getAllUsers);
router.get('/:id', authenticate, validateRequest(userIdParamSchema), userController.getUserById);

export { router as userRoutes };
