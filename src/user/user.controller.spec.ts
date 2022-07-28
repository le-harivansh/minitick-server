import { Test, TestingModule } from '@nestjs/testing';
import { Request as ExpressRequest } from 'express';

import { User, UserData } from './schema/user.schema';
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
        const request = {
          user: { username: 'le-user' },
        } as unknown as ExpressRequest;
        const payload: Partial<Omit<User, 'hashedRefreshTokens'>> = {
          username: 'new-username',
        };

        await userController.update(request, payload);

        expect(userService.updateUser).toHaveBeenCalledTimes(1);
        expect(userService.updateUser).toHaveBeenCalledWith(
          (request.user as UserData).username,
          payload,
        );
      });
    });
  });
});
