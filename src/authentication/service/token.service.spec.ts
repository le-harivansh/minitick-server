import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { ObjectId } from 'mongodb';
import ms from 'ms';

import { RequestUser } from '../../user/schema/user.schema';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import { TokenService } from './token.service';

describe(TokenService.name, () => {
  const requestUser: RequestUser = {
    id: new ObjectId().toString(),
    username: 'OneTwo',
  };
  const RETURNED_TOKEN = 'TOKEN';
  const jwtService = {
    signAsync: jest.fn((_payload, _options) => Promise.resolve(RETURNED_TOKEN)),
  };
  const configService = {
    getOrThrow: jest.fn(
      (configurationKey: string) =>
        ({
          'authentication.jwt.accessToken.secret': 'access-token-secret',
          'authentication.jwt.accessToken.duration': '15 minutes',
          'authentication.jwt.refreshToken.secret': 'refresh-token-secret',
          'authentication.jwt.refreshToken.duration': '1 week',
        }[configurationKey]),
    ),
  };

  let tokenService: TokenService;

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
        TokenService,
      ],
    }).compile();

    tokenService = module.get(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('generateAccessToken', () => {
    describe('when called', () => {
      test('it calls the resolved `JwtService` with the correct arguments', async () => {
        expect(tokenService.generateAccessToken(requestUser)).resolves.toBe(
          RETURNED_TOKEN,
        );

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
  });

  describe('generateRefreshToken', () => {
    describe('when called', () => {
      test('it calls the resolved `JwtService` with the correct arguments', async () => {
        expect(tokenService.generateRefreshToken(requestUser)).resolves.toBe(
          RETURNED_TOKEN,
        );

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
  });

  describe('attachTokenCookieToResponse', () => {
    describe('when called', () => {
      test('it attaches a cookie to the provided response using the correct options', () => {
        const cookieName = 'rx-token';
        const cookieValue = 'le-token';
        const maxAge = 60_000;
        const response = { cookie: jest.fn() } as unknown as ExpressResponse;

        TokenService.attachTokenCookieToResponse(
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
  });

  describe('attachAccessTokenCookieToResponse', () => {
    describe('when called', () => {
      const accessTokenValue = 'ACCESS_TOKEN_VALUE';

      let generateAccessTokenSpy: jest.SpyInstance<
        Promise<string>,
        [RequestUser]
      >;
      let attachTokenCookieToResponseSpy: jest.SpyInstance<
        void,
        [
          cookieName: string,
          cookieValue: unknown,
          maxAge: number,
          response: ExpressResponse<any, Record<string, any>>,
        ]
      >;

      beforeAll(() => {
        generateAccessTokenSpy = jest
          .spyOn(tokenService, 'generateAccessToken')
          .mockImplementationOnce(async () => accessTokenValue);
        attachTokenCookieToResponseSpy = jest.spyOn(
          TokenService,
          'attachTokenCookieToResponse',
        );
      });

      afterAll(() => {
        jest.restoreAllMocks();
      });

      test('it calls the appropriate methods to attach an access-token to the cookie', async () => {
        const response = { cookie: jest.fn() } as unknown as ExpressResponse;

        await tokenService.attachAccessTokenCookieToResponse(
          requestUser,
          response,
        );

        expect(generateAccessTokenSpy).toBeCalledWith(requestUser);
        expect(attachTokenCookieToResponseSpy).toBeCalledWith(
          ACCESS_TOKEN,
          accessTokenValue,
          ms(
            configService.getOrThrow('authentication.jwt.accessToken.duration'),
          ),
          response,
        );
      });
    });
  });

  describe('attachRefreshTokenCookieToResponse', () => {
    describe('when called', () => {
      const refreshTokenValue = 'REFRESH_TOKEN_VALUE';

      let generateRefreshTokenSpy: jest.SpyInstance<
        Promise<string>,
        [RequestUser]
      >;
      let attachTokenCookieToResponseSpy: jest.SpyInstance<
        void,
        [
          cookieName: string,
          cookieValue: unknown,
          maxAge: number,
          response: ExpressResponse<any, Record<string, any>>,
        ]
      >;

      beforeAll(() => {
        generateRefreshTokenSpy = jest
          .spyOn(tokenService, 'generateRefreshToken')
          .mockImplementationOnce(async () => refreshTokenValue);
        attachTokenCookieToResponseSpy = jest.spyOn(
          TokenService,
          'attachTokenCookieToResponse',
        );
      });

      afterAll(() => {
        jest.restoreAllMocks();
      });

      test('it calls the appropriate methods to attach a refresh-token to the cookie', async () => {
        const response = { cookie: jest.fn() } as unknown as ExpressResponse;

        const attachedRefreshedToken =
          await tokenService.attachRefreshTokenCookieToResponse(
            requestUser,
            response,
          );

        expect(attachedRefreshedToken).toBe(refreshTokenValue);

        expect(generateRefreshTokenSpy).toBeCalledWith(requestUser);
        expect(attachTokenCookieToResponseSpy).toBeCalledWith(
          REFRESH_TOKEN,
          refreshTokenValue,
          ms(
            configService.getOrThrow(
              'authentication.jwt.refreshToken.duration',
            ),
          ),
          response,
        );
      });
    });
  });

  describe('clearTokenCookieFromResponse', () => {
    test('it calls `Response.clearCookie` with the correct options', () => {
      const cookieName = 'le-cookie';
      const response = { clearCookie: jest.fn() } as unknown as ExpressResponse;

      TokenService.clearTokenCookieFromResponse(cookieName, response);

      expect(response.clearCookie).toBeCalledWith(cookieName, {
        secure: true,
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
      });
    });
  });

  describe('clearAccessTokenCookieFromResponse', () => {
    test('it calls `TokenService.clearTokenCookieFromResponse` with the correct options', () => {
      const response = { clearCookie: jest.fn() } as unknown as ExpressResponse;

      const clearTokenCookieFromResponseSpy = jest.spyOn(
        TokenService,
        'clearTokenCookieFromResponse',
      );

      TokenService.clearAccessTokenCookieFromResponse(response);

      expect(clearTokenCookieFromResponseSpy).toBeCalledWith(
        ACCESS_TOKEN,
        response,
      );
    });
  });

  describe('clearRefreshTokenCookieFromResponse', () => {
    test('it calls `TokenService.clearTokenCookieFromResponse` with the correct options', () => {
      const response = { clearCookie: jest.fn() } as unknown as ExpressResponse;

      const clearTokenCookieFromResponseSpy = jest.spyOn(
        TokenService,
        'clearTokenCookieFromResponse',
      );

      TokenService.clearRefreshTokenCookieFromResponse(response);

      expect(clearTokenCookieFromResponseSpy).toBeCalledWith(
        REFRESH_TOKEN,
        response,
      );
    });
  });
});
