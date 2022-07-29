import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';

import { User } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let userController: UserController;
  const userService = { updateUser: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
      controllers: [UserController],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  describe('update', () => {
    describe('when called', () => {
      test('it calls `UserService::updateUser` with the appropriate arguments', async () => {
        const userId = new ObjectId().toString();
        const payload: Partial<Omit<User, 'hashedRefreshTokens'>> = {
          username: 'new-username',
        };

        await userController.update(userId, payload);

        expect(userService.updateUser).toHaveBeenCalledTimes(1);
        expect(userService.updateUser).toHaveBeenCalledWith(userId, payload);
      });
    });
  });
});
