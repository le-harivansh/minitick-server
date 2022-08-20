import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';
import ms from 'ms';

import { RequestUser } from '../../user/schema/user.schema';
import {
  ACCESS_TOKEN,
  PASSWORD_CONFIRMATION_TOKEN,
  REFRESH_TOKEN,
} from '../constants';
import { TokenRefreshService } from './token-refresh.service';

describe(TokenRefreshService.name, () => {
  const user: RequestUser = {
    id: new ObjectId().toString(),
    username: 'OneTwo',
  };

  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as ExpressResponse;

  const jwtToken = 'GENERATED-TOKEN';
  const jwtService = {
    signAsync: jest.fn((_payload, _options) => Promise.resolve(jwtToken)),
  };

  const configuration = {
    'authentication.jwt.accessToken.secret': 'access-token-secret',
    'authentication.jwt.accessToken.duration': '15 minutes',

    'authentication.jwt.refreshToken.secret': 'refresh-token-secret',
    'authentication.jwt.refreshToken.duration': '1 week',

    'authentication.jwt.passwordConfirmationToken.secret':
      'password-confirmation-token-secret',
    'authentication.jwt.passwordConfirmationToken.duration': '5 minutes',
  };
  const configService = {
    getOrThrow: jest.fn(
      (key: keyof typeof configuration) => configuration[key],
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
  });

  describe('[attach x-token-cookie to response]', () => {
    const attachTokenCookieToResponse =
      TokenRefreshService['attachTokenCookieToResponse'];

    beforeAll(() => {
      TokenRefreshService['attachTokenCookieToResponse'] = jest.fn();
    });

    afterAll(() => {
      TokenRefreshService['attachTokenCookieToResponse'] =
        attachTokenCookieToResponse;
    });

    describe('attachAccessTokenCookieToResponse', () => {
      const duration = ms(
        configuration['authentication.jwt.accessToken.duration'],
      );

      beforeAll(() => {
        jest
          .spyOn(tokenRefreshService as any, 'generateAccessToken')
          .mockImplementation(async () => ({
            token: jwtToken,
            duration: duration,
          }));
      });

      afterAll(() => {
        jest.restoreAllMocks();
      });

      it('calls the appropriate methods', async () => {
        await tokenRefreshService.attachAccessTokenCookieToResponse(
          user,
          response,
        );

        expect(tokenRefreshService['generateAccessToken']).toBeCalledTimes(1);
        expect(tokenRefreshService['generateAccessToken']).toBeCalledWith(user);

        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledWith(ACCESS_TOKEN, jwtToken, duration, response);
      });

      it('returns the expiry timestamp of the token & cookie', async () => {
        const { expiresAt } =
          await tokenRefreshService.attachAccessTokenCookieToResponse(
            user,
            response,
          );

        /**
         * Check that the expected `expiresAt` value is within 1 second of the
         * received `expiresAt`.
         * This is done because we don't know the actual `expiresAt`, but we know
         * that it should be close to the expected one.
         */
        const expectedExpiresAt = Date.now() + duration;

        expect(Math.abs(expiresAt - expectedExpiresAt)).toBeLessThanOrEqual(
          1 * 1000,
        );
      });
    });

    describe('attachRefreshTokenCookieToResponse', () => {
      const duration = ms(
        configuration['authentication.jwt.refreshToken.duration'],
      );

      beforeAll(() => {
        jest
          .spyOn(tokenRefreshService as any, 'generateRefreshToken')
          .mockImplementation(async () => ({
            token: jwtToken,
            duration: duration,
          }));
      });

      afterAll(() => {
        jest.restoreAllMocks();
      });

      it('calls the appropriate methods', async () => {
        await tokenRefreshService.attachRefreshTokenCookieToResponse(
          user,
          response,
        );

        expect(tokenRefreshService['generateRefreshToken']).toBeCalledTimes(1);
        expect(tokenRefreshService['generateRefreshToken']).toBeCalledWith(
          user,
        );

        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledWith(REFRESH_TOKEN, jwtToken, duration, response);
      });

      it('returns the expiry timestamp of the token & cookie', async () => {
        const { token, expiresAt } =
          await tokenRefreshService.attachRefreshTokenCookieToResponse(
            user,
            response,
          );

        expect(token).toBe(jwtToken);

        /**
         * Check that the expected `expiresAt` value is within 1 second of the
         * received `expiresAt`.
         * This is done because we don't know the actual `expiresAt`, but we know
         * that it should be close to the expected one.
         */
        const expectedExpiresAt = Date.now() + duration;

        expect(Math.abs(expiresAt - expectedExpiresAt)).toBeLessThanOrEqual(
          1 * 1000,
        );
      });
    });

    describe('attachPasswordConfirmationTokenCookieToResponse', () => {
      const duration = ms(
        configuration['authentication.jwt.passwordConfirmationToken.duration'],
      );

      beforeAll(() => {
        jest
          .spyOn(
            tokenRefreshService as any,
            'generatePasswordConfirmationToken',
          )
          .mockImplementation(async () => ({
            token: jwtToken,
            duration: duration,
          }));
      });

      afterAll(() => {
        jest.restoreAllMocks();
      });

      it('calls the appropriate methods', async () => {
        await tokenRefreshService.attachPasswordConfirmationTokenCookieToResponse(
          user,
          response,
        );

        expect(
          tokenRefreshService['generatePasswordConfirmationToken'],
        ).toBeCalledTimes(1);
        expect(
          tokenRefreshService['generatePasswordConfirmationToken'],
        ).toBeCalledWith(user);

        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['attachTokenCookieToResponse'],
        ).toBeCalledWith(
          PASSWORD_CONFIRMATION_TOKEN,
          jwtToken,
          duration,
          response,
        );
      });

      it('returns the expiry timestamp of the token & cookie', async () => {
        const { expiresAt } =
          await tokenRefreshService.attachPasswordConfirmationTokenCookieToResponse(
            user,
            response,
          );

        /**
         * Check that the expected `expiresAt` value is within 1 second of the
         * received `expiresAt`.
         * This is done because we don't know the actual `expiresAt`, but we know
         * that it should be close to the expected one.
         */
        const expectedExpiresAt = Date.now() + duration;

        expect(Math.abs(expiresAt - expectedExpiresAt)).toBeLessThanOrEqual(
          1 * 1000,
        );
      });
    });
  });

  describe('[clear x-token-cookie from response', () => {
    const clearTokenCookieFromResponse =
      TokenRefreshService['clearTokenCookieFromResponse'];

    beforeAll(() => {
      TokenRefreshService['clearTokenCookieFromResponse'] = jest.fn();
    });

    afterAll(() => {
      TokenRefreshService['clearTokenCookieFromResponse'] =
        clearTokenCookieFromResponse;
    });

    describe('clearAccessTokenCookieFromResponse', () => {
      it('calls the appropriate method with the correct arguments', () => {
        TokenRefreshService.clearAccessTokenCookieFromResponse(response);

        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledWith(ACCESS_TOKEN, response);
      });
    });

    describe('clearRefreshTokenCookieFromResponse', () => {
      it('calls the appropriate method with the correct arguments', () => {
        TokenRefreshService.clearRefreshTokenCookieFromResponse(response);

        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledWith(REFRESH_TOKEN, response);
      });
    });

    describe('clearPasswordConfirmationTokenCookieFromResponse', () => {
      it('calls the appropriate method with the correct arguments', () => {
        TokenRefreshService.clearPasswordConfirmationTokenCookieFromResponse(
          response,
        );

        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledTimes(1);
        expect(
          TokenRefreshService['clearTokenCookieFromResponse'],
        ).toBeCalledWith(PASSWORD_CONFIRMATION_TOKEN, response);
      });
    });
  });

  describe('generateAccessToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      await tokenRefreshService['generateAccessToken'](user);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: user.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret: configuration['authentication.jwt.accessToken.secret'],
        expiresIn: configuration['authentication.jwt.accessToken.duration'],
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.accessToken.secret',
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.accessToken.duration',
      );
    });

    it('returns the generated access-token and its duration', () => {
      expect(
        tokenRefreshService['generateAccessToken'](user),
      ).resolves.toMatchObject({
        token: jwtToken,
        duration: ms(configuration['authentication.jwt.accessToken.duration']),
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      await tokenRefreshService['generateRefreshToken'](user);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: user.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret: configuration['authentication.jwt.refreshToken.secret'],
        expiresIn: configuration['authentication.jwt.refreshToken.duration'],
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.refreshToken.secret',
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.refreshToken.duration',
      );
    });

    it('returns the generated refresh-token and its duration', () => {
      expect(
        tokenRefreshService['generateRefreshToken'](user),
      ).resolves.toMatchObject({
        token: jwtToken,
        duration: ms(configuration['authentication.jwt.refreshToken.duration']),
      });
    });
  });

  describe('generatePasswordConfirmationToken', () => {
    it('calls the resolved `JwtService` with the correct arguments', async () => {
      await tokenRefreshService['generatePasswordConfirmationToken'](user);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
        sub: user.id,
      });
      expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
        secret:
          configuration['authentication.jwt.passwordConfirmationToken.secret'],
        expiresIn:
          configuration[
            'authentication.jwt.passwordConfirmationToken.duration'
          ],
      });

      expect(configService.getOrThrow).toHaveBeenCalledTimes(2);

      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.passwordConfirmationToken.secret',
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'authentication.jwt.passwordConfirmationToken.duration',
      );
    });

    it('returns the generated password-confirmation token and its duration', () => {
      expect(
        tokenRefreshService['generatePasswordConfirmationToken'](user),
      ).resolves.toMatchObject({
        token: jwtToken,
        duration: ms(
          configuration[
            'authentication.jwt.passwordConfirmationToken.duration'
          ],
        ),
      });
    });
  });

  describe('attachTokenCookieToResponse', () => {
    it('calls `Response.cookie` with the correct arguments', () => {
      const cookieName = 'rx-token';
      const cookieValue = 'le-token';
      const maxAge = 60_000;

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
