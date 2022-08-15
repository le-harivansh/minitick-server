import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';

import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { TokenService } from '../service/token.service';
import { TokenController } from './token.controller';

describe(TokenController.name, () => {
  const refreshToken = 'REFRESH-TOKEN';

  const tokenService = {
    attachAccessTokenCookieToResponse: jest.fn(),
    attachRefreshTokenCookieToResponse: jest.fn(() => refreshToken),
  };

  const userService = {
    saveHashedRefreshToken: jest.fn(),
  };

  let tokenController: TokenController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
      ],
      controllers: [TokenController],
    }).compile();

    tokenController = module.get(TokenController);
  });

  describe('regenerateAccessToken', () => {
    test('it calls the appropriate method on the TokenService class', async () => {
      const response = Symbol('response') as unknown as ExpressResponse;
      const user = Symbol('user') as unknown as RequestUser;

      await tokenController.regenerateAccessToken(user, response);

      expect(tokenService.attachAccessTokenCookieToResponse).toBeCalledWith(
        user,
        response,
      );
    });
  });

  describe('regenerateRefreshToken', () => {
    test('it calls the appropriate method on the TokenService class', async () => {
      const response = Symbol('response') as unknown as ExpressResponse;
      const user = Symbol('user') as unknown as RequestUser;

      await tokenController.regenerateRefreshToken(user, response);

      expect(tokenService.attachRefreshTokenCookieToResponse).toBeCalledWith(
        user,
        response,
      );
    });

    test('it calls the appropriate method on the UserService class', async () => {
      const response = Symbol('response') as unknown as ExpressResponse;
      const user = { id: new ObjectId().toString() } as unknown as RequestUser;

      await tokenController.regenerateRefreshToken(user, response);

      expect(userService.saveHashedRefreshToken).toBeCalledWith(
        user.id,
        refreshToken,
      );
    });
  });
});
