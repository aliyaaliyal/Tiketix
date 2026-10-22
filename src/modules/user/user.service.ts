import bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';
import { RegisterUserInput } from './user.validator';
import { ConflictError, NotFoundError } from '../../common/errors';
import { UserRole } from '@prisma/client';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterUserInput) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`Email '${input.email}' is already registered`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role as UserRole,
      phoneNumber: input.phoneNumber,
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async getAllUsers() {
    return this.userRepository.findAll();
  }
}
