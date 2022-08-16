import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';

import { RequestUser } from '../../user/schema/user.schema';
import { TokenRefreshService } from './token-refresh.service';

describe(TokenRefreshService.name, () => {
  const requestUser: RequestUser = {
    id: new ObjectId().toString(),
    username: 'OneTwo',
  };
  const jwtToken = 'TOKEN';
  const jwtService = {
    signAsync: jest.fn((_payload, _options) => Promise.resolve(jwtToken)),
  };
  const configService = {
    getOrThrow: jest.fn(
      (configurationKey: string) =>
        ({
          'authentication.jwt.accessToken.secret': 'access-token-secret',
          'authentication.jwt.accessToken.duration': '15 minutes',

          'authentication.jwt.refreshToken.secret': 'refresh-token-secret',
          'authentication.jwt.refreshToken.duration': '1 week',

          'authentication.jwt.passwordConfirmationToken.secret':
            'password-confirmation-token-secret',
          'authentication.jwt.passwordConfirmationToken.duration': '5 minutes',
        }[configurationKey]),
    ),
  };

  let tokenRefreshService: TokenRefreshService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        TokenRefreshService,
      ],
    }).compile();

    tokenRefreshService = module.get(TokenRefreshService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('generateAccessToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      expect(
        tokenRefreshService['generateAccessToken'](requestUser),
      ).resolves.toBe(jwtToken);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: requestUser.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret: 'access-token-secret',
        expiresIn: '15 minutes',
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow.mock.calls[0][0]).toBe(
        'authentication.jwt.accessToken.secret',
      );
      expect(configService.getOrThrow.mock.calls[1][0]).toBe(
        'authentication.jwt.accessToken.duration',
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      expect(
        tokenRefreshService['generateRefreshToken'](requestUser),
      ).resolves.toBe(jwtToken);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: requestUser.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret: 'refresh-token-secret',
        expiresIn: '1 week',
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow.mock.calls[0][0]).toBe(
        'authentication.jwt.refreshToken.secret',
      );
      expect(configService.getOrThrow.mock.calls[1][0]).toBe(
        'authentication.jwt.refreshToken.duration',
      );
    });
  });

  describe('generatePasswordConfirmationToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      expect(
        tokenRefreshService['generatePasswordConfirmationToken'](requestUser),
      ).resolves.toBe(jwtToken);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: requestUser.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret: 'password-confirmation-token-secret',
        expiresIn: '5 minutes',
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow.mock.calls[0][0]).toBe(
        'authentication.jwt.passwordConfirmationToken.secret',
      );
      expect(configService.getOrThrow.mock.calls[1][0]).toBe(
        'authentication.jwt.passwordConfirmationToken.duration',
      );
    });
  });

  describe('attachTokenCookieToResponse', () => {
    it('calls `Response.cookie` with the correct arguments', () => {
      const cookieName = 'rx-token';
      const cookieValue = 'le-token';
      const maxAge = 60_000;
      const response = { cookie: jest.fn() } as unknown as ExpressResponse;

      TokenRefreshService['attachTokenCookieToResponse'](
        cookieName,
        cookieValue,
        maxAge,
        response,
      );

      expect(response.cookie).toHaveBeenCalledWith(cookieName, cookieValue, {
        secure: true,
        httpOnly: true,
        signed: true,
        maxAge,
        sameSite: 'lax',
      });
    });
  });

  describe('clearTokenCookieFromResponse', () => {
    it('calls `Response.clearCookie` with the correct options', () => {
      const cookieName = 'le-cookie';
      const response = { clearCookie: jest.fn() } as unknown as ExpressResponse;

      TokenRefreshService['clearTokenCookieFromResponse'](cookieName, response);

      expect(response.clearCookie).toBeCalledWith(cookieName, {
        secure: true,
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
      });
    });
  });
});
