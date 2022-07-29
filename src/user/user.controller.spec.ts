import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';

import { ACCESS_TOKEN, REFRESH_TOKEN } from '../authentication/constants';
import { User } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let userController: UserController;
  const userService = { updateUser: jest.fn(), deleteUser: jest.fn() };

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

  describe('delete', () => {
    const responseMock = { clearCookie: jest.fn() };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('when called', () => {
      test("it calls `UserService::deleteUser` with a user's id", async () => {
        const userId = new ObjectId().toString();

        await userController.delete(
          userId,
          responseMock as unknown as ExpressResponse,
        );

        expect(userService.deleteUser).toHaveBeenCalledTimes(1);
        expect(userService.deleteUser).toHaveBeenCalledWith(userId);
      });

      test('it clears the access-token cookies', async () => {
        const userId = new ObjectId().toString();

        await userController.delete(
          userId,
          responseMock as unknown as ExpressResponse,
        );
        expect(responseMock.clearCookie).toHaveBeenCalledTimes(2);
        expect(responseMock.clearCookie).toHaveBeenCalledWith(ACCESS_TOKEN, {
          secure: true,
          httpOnly: true,
          signed: true,
          sameSite: 'lax',
        });
      });

      test('it clears the access-token cookies', async () => {
        const userId = new ObjectId().toString();

        await userController.delete(
          userId,
          responseMock as unknown as ExpressResponse,
        );
        expect(responseMock.clearCookie).toHaveBeenCalledTimes(2);
        expect(responseMock.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN, {
          secure: true,
          httpOnly: true,
          signed: true,
          sameSite: 'lax',
        });
      });
    });
  });
});
