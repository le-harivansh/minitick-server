import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { ObjectId } from 'mongodb';

import { ACCESS_TOKEN, PASSWORD_CONFIRMATION_TOKEN } from '../constants';
import { RequiresPasswordConfirmationToken } from './password-confirmation.guard';

describe(RequiresPasswordConfirmationToken.name, () => {
  const userId_1 = new ObjectId().toString();
  const userId_2 = new ObjectId().toString();

  const userId_1_accessToken = 'le-access-token user-1';
  const userId_1_passwordConfirmationToken =
    'le-password-confirmation-token user-1';

  const userId_2_accessToken = 'le-access-token user-2';
  const userId_2_passwordConfirmationToken =
    'le-password-confirmation-token user-2';

  const undefinedPayloadAccessToken = 'undefined-payload-access-token';
  const undefinedPayloadPasswordConfirmationToken =
    'undefined-payload-password-confirmation-token';

  const accessTokenSecret = 'le-access-token-secret';
  const passwordConfirmationTokenSecret =
    'le-password-confirmation-token-secret';

  const configService = {
    getOrThrow(key: string) {
      switch (key) {
        case 'authentication.jwt.accessToken.secret':
          return accessTokenSecret;
        case 'authentication.jwt.passwordConfirmationToken.secret':
          return passwordConfirmationTokenSecret;

        default:
          throw new Error(`Invalid key - ${key}.`);
      }
    },
  } as unknown as ConfigService;

  const jwtService = {
    verifyAsync: jest.fn(async (token: string, _options: JwtVerifyOptions) => {
      switch (token) {
        case userId_1_accessToken:
          return Promise.resolve({ sub: userId_1 });

        case userId_2_accessToken:
          return Promise.resolve({ sub: userId_2 });

        case undefinedPayloadAccessToken:
          return Promise.resolve({ sub: undefined });

        case userId_1_passwordConfirmationToken:
          return Promise.resolve({ sub: userId_1 });

        case userId_2_passwordConfirmationToken:
          return Promise.resolve({ sub: userId_2 });

        case undefinedPayloadPasswordConfirmationToken:
          return Promise.resolve({ sub: undefined });

        default:
          return Promise.reject('Invalid token');
      }
    }),
  } as unknown as JwtService;

  const generateExecutionContextWithSignedCookies = (
    signedCookies: Record<string, string>,
  ) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ signedCookies }) }),
    } as unknown as ExecutionContext);

  let passwordConfirmationGuard: RequiresPasswordConfirmationToken;

  beforeAll(() => {
    passwordConfirmationGuard = new RequiresPasswordConfirmationToken(
      configService,
      jwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns false if the access-token is not present in the signed-cookies array', async () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContextWithSignedCookies({
          [PASSWORD_CONFIRMATION_TOKEN]: 'a password-confirmation-token',
        }),
      ),
    ).resolves.toBe(false);
  });

  it('returns false if the password-confirmation-token is not present in the signed-cookies array', async () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContextWithSignedCookies({
          [ACCESS_TOKEN]: 'an access-token',
        }),
      ),
    ).resolves.toBe(false);
  });

  it('calls JwtService.verifyAsync with the correct arguments', async () => {
    await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: userId_1_accessToken,
        [PASSWORD_CONFIRMATION_TOKEN]: userId_1_passwordConfirmationToken,
      }),
    );

    const jwtServiceVerifyAsyncCalls = (
      jwtService.verifyAsync as ReturnType<typeof jest.fn>
    ).mock.calls;

    expect(jwtServiceVerifyAsyncCalls[0]).toEqual([
      userId_1_accessToken,
      { secret: accessTokenSecret },
    ]);
    expect(jwtServiceVerifyAsyncCalls[1]).toEqual([
      userId_1_passwordConfirmationToken,
      { secret: passwordConfirmationTokenSecret },
    ]);
  });

  it('returns false if an incorrect access-token is provided', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: 'incorrect access-token',
        [PASSWORD_CONFIRMATION_TOKEN]: userId_1_passwordConfirmationToken,
      }),
    );

    expect(result).toBe(false);
  });

  it('returns false if an incorrect password-confirmation token is provided', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: userId_1_accessToken,
        [PASSWORD_CONFIRMATION_TOKEN]: 'incorrect password-confirmation token',
      }),
    );

    expect(result).toBe(false);
  });

  it('returns false if the `sub` in the access-token payload is falsy', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: undefinedPayloadAccessToken,
        [PASSWORD_CONFIRMATION_TOKEN]: userId_1_passwordConfirmationToken,
      }),
    );

    expect(result).toBe(false);
  });

  it('returns false if the `sub` in the password-confirmation-token payload is falsy', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: userId_1_accessToken,
        [PASSWORD_CONFIRMATION_TOKEN]:
          undefinedPayloadPasswordConfirmationToken,
      }),
    );

    expect(result).toBe(false);
  });

  it('returns false if the `sub` in the access-token payload is not equal to the `sub` in the password-confirmation-token payload', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: userId_1_accessToken,
        [PASSWORD_CONFIRMATION_TOKEN]: userId_2_passwordConfirmationToken,
      }),
    );

    expect(result).toBe(false);
  });

  it('returns true if the `sub` in the access-token payload is equal to the `sub` in the password-confirmation-token payload', async () => {
    const result = await passwordConfirmationGuard.canActivate(
      generateExecutionContextWithSignedCookies({
        [ACCESS_TOKEN]: userId_1_accessToken,
        [PASSWORD_CONFIRMATION_TOKEN]: userId_1_passwordConfirmationToken,
      }),
    );

    expect(result).toBe(true);
  });
});
