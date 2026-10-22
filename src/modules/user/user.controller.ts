import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { sendCreated, sendSuccess } from '../../common/response';
import { ForbiddenError } from '../../common/errors';

export class UserController {
  constructor(private readonly userService: UserService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.register(req.body);
      return sendCreated(res, user, 'User registered successfully');
    } catch (error) {
      return next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (req.user?.role !== 'ADMIN' && req.user?.id !== id) {
        throw new ForbiddenError('You are not authorized to view this user profile');
      }
      const user = await this.userService.getUserById(id);
      return sendSuccess(res, user);
    } catch (error) {
      return next(error);
    }
  };

  getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAllUsers();
      return sendSuccess(res, users);
    } catch (error) {
      return next(error);
    }
  };
}
