import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import ms from 'ms';

import { UserData } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

describe(AuthenticationController.name, () => {
  const accessToken = 'ACCESS-TOKEN';
  const refreshToken = 'REFRESH-TOKEN';
  const maxAgeDuration = '15 minutes';

  const authenticationService = {
    generateAccessToken: jest.fn(() => accessToken),
    generateRefreshToken: jest.fn(() => refreshToken),
  };
  const userService = { saveRefreshToken: jest.fn() };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      switch (key) {
        case 'authentication.jwt.accessToken.duration':
        case 'authentication.jwt.refreshToken.duration':
          return maxAgeDuration;

        default:
          throw new Error(`Key '${key}' not found.`);
      }
    }),
  };

  let authenticationController: AuthenticationController;

  const requestMock = {
    user: { username: 'user-1000' } as UserData,
  } as unknown as ExpressRequest;

  const responseMock = { cookie: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthenticationService,
          useValue: authenticationService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
      controllers: [AuthenticationController],
    }).compile();

    authenticationController = module.get(AuthenticationController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('regenerateTokens', () => {
    describe('when called', () => {
      test("it calls `AuthenticationService::generateAccessToken` with the authenticated user's data as its argument", async () => {
        await authenticationController['regenerateTokens'](
          requestMock,
          responseMock as unknown as ExpressResponse,
        );

        expect(authenticationService.generateAccessToken).toHaveBeenCalledWith(
          requestMock.user,
        );
      });

      test("it calls `AuthenticationService::generateRefreshToken` with the authenticated user's data as its argument", async () => {
        await authenticationController['regenerateTokens'](
          requestMock,
          responseMock as unknown as ExpressResponse,
        );

        expect(authenticationService.generateRefreshToken).toHaveBeenCalledWith(
          requestMock.user,
        );
      });

      test('it calls `UserService::saveRefreshToken` with the appropriate arguments', async () => {
        await authenticationController['regenerateTokens'](
          requestMock,
          responseMock as unknown as ExpressResponse,
        );

        expect(userService.saveRefreshToken).toHaveBeenCalledWith(
          (requestMock.user as UserData).username,
          refreshToken,
        );
      });

      test('it creates the access-token cookie via `response.cookie`', async () => {
        await authenticationController['regenerateTokens'](
          requestMock,
          responseMock as unknown as ExpressResponse,
        );

        expect(configService.getOrThrow).toHaveBeenCalledWith(
          'authentication.jwt.accessToken.duration',
        );
        expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

        expect(responseMock.cookie).toHaveBeenCalledWith(
          ACCESS_TOKEN,
          accessToken,
          {
            secure: true,
            httpOnly: true,
            signed: true,
            maxAge: ms(maxAgeDuration),
            sameSite: 'lax',
          },
        );
      });

      test('it creates the refresh-token cookie via `response.cookie`', async () => {
        await authenticationController['regenerateTokens'](
          requestMock,
          responseMock as unknown as ExpressResponse,
        );

        expect(configService.getOrThrow).toHaveBeenCalledWith(
          'authentication.jwt.refreshToken.duration',
        );
        expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

        expect(responseMock.cookie).toHaveBeenCalledWith(
          REFRESH_TOKEN,
          refreshToken,
          {
            secure: true,
            httpOnly: true,
            signed: true,
            maxAge: ms(maxAgeDuration),
            sameSite: 'lax',
          },
        );
      });
    });
  });
});
