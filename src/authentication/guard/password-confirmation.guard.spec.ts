import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ObjectId } from 'mongodb';

import { RequestUser } from '../../user/schema/user.schema';
import { PASSWORD_CONFIRMATION_TOKEN } from '../constants';
import { RequiresPasswordConfirmationToken } from './password-confirmation.guard';

describe(RequiresPasswordConfirmationToken.name, () => {
  const userData = [
    {
      id: new ObjectId().toString(),
      passwordConfirmationToken: 'user-1-passwordConfirmationToken',
    },
    {
      id: new ObjectId().toString(),
      passwordConfirmationToken: 'user-2-passwordConfirmationToken',
    },
  ];

  const configService = {
    getOrThrow: () => undefined,
  } as unknown as ConfigService;

  const jwtService = {
    verifyAsync: jest.fn(async (tokenToVerify: string) => {
      const user = userData.find(
        ({ passwordConfirmationToken }) =>
          passwordConfirmationToken === tokenToVerify,
      );

      return !!user
        ? Promise.resolve({ sub: user.id })
        : Promise.reject('Invalid token.');
    }),
  } as unknown as JwtService;

  const generateExecutionContext = (
    authenticatedUser: Pick<RequestUser, 'id'> | undefined,
    passwordConfirmationToken: string,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: authenticatedUser,
          signedCookies: {
            [PASSWORD_CONFIRMATION_TOKEN]: passwordConfirmationToken,
          },
        }),
      }),
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

  it('returns false if the password-confirmation token is invalid', () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContext(
          { id: new ObjectId().toString() },
          'invalid password-confirmation token',
        ),
      ),
    ).resolves.toBe(false);
  });

  it('returns false if there is no request.user object', () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContext(
          undefined,
          userData[0].passwordConfirmationToken,
        ),
      ),
    ).resolves.toBe(false);
  });

  it("returns false if the authenticated user's id does not match the user-id in the password-confirmation payload", () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContext(
          { id: userData[0].id },
          userData[1].passwordConfirmationToken,
        ),
      ),
    ).resolves.toBe(false);
  });

  it("returns true if the authenticated user's id matches with the user-id in the password-confirmation payload", () => {
    expect(
      passwordConfirmationGuard.canActivate(
        generateExecutionContext(
          { id: userData[0].id },
          userData[0].passwordConfirmationToken,
        ),
      ),
    ).resolves.toBe(true);
  });
});
