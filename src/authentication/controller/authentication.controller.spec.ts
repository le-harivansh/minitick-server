import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';

import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { TokenService } from '../service/token.service';
import { AuthenticationController } from './authentication.controller';

describe(AuthenticationController.name, () => {
  const refreshToken = 'REFRESH-TOKEN';

  const tokenService = {
    attachAccessTokenCookieToResponse: jest.fn(),
    attachRefreshTokenCookieToResponse: jest.fn(() => refreshToken),
  };

  const userService = {
    saveHashedRefreshToken: jest.fn(),
  };

  let authenticationController: AuthenticationController;

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
      controllers: [AuthenticationController],
    }).compile();

    authenticationController = module.get(AuthenticationController);
  });

  describe('login', () => {
    test('it calls the appropriate methods', async () => {
      const response = Symbol('response') as unknown as ExpressResponse;
      const user = { id: new ObjectId().toString() } as unknown as RequestUser;

      await authenticationController.login(user, response);

      expect(tokenService.attachAccessTokenCookieToResponse).toBeCalledWith(
        user,
        response,
      );

      expect(tokenService.attachRefreshTokenCookieToResponse).toBeCalledWith(
        user,
        response,
      );

      expect(userService.saveHashedRefreshToken).toBeCalledWith(
        user.id,
        refreshToken,
      );
    });
  });
});
