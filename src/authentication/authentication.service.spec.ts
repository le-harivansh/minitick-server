import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';
import { ObjectId } from 'mongodb';

import { RequestUser } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationService } from './authentication.service';

describe(AuthenticationService.name, () => {
  const requestUser: RequestUser = {
    id: new ObjectId().toString(),
    username: 'OneTwo',
  };
  const userPassword = 'onetwo';
  const jwtService = { signAsync: jest.fn() };
  const configService = { getOrThrow: jest.fn() };

  let authenticationService: AuthenticationService;

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
        {
          provide: UserService,
          useValue: {
            async findByUsername(username: string) {
              switch (username) {
                case requestUser.username:
                  return {
                    username: requestUser.username,
                    password: await hash(userPassword, { type: argon2id }),
                  };

                default:
                  return undefined;
              }
            },
          },
        },
        AuthenticationService,
      ],
    }).compile();

    authenticationService = module.get(AuthenticationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('credentialsAreValid', () => {
    describe('when called', () => {
      test('it returns true if correct user-credentials are passed', async () => {
        expect(
          authenticationService.credentialsAreValid(
            requestUser.username,
            userPassword,
          ),
        ).resolves.toBe(true);
      });

      test('it returns false if incorrect user-credentials are passed', async () => {
        expect(
          authenticationService.credentialsAreValid(
            requestUser.username,
            'wrong-password',
          ),
        ).resolves.toBe(false);
      });
    });
  });

  describe('generateAccessToken', () => {
    describe('when called', () => {
      test('it calls the resolved `JwtService` with the correct arguments', async () => {
        await authenticationService.generateAccessToken(requestUser);

        expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

        expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
          sub: requestUser.id,
        });
        expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
          secret: undefined,
          expiresIn: undefined,
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
        await authenticationService.generateRefreshToken(requestUser);

        expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

        expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
          sub: requestUser.id,
        });
        expect(jwtService.signAsync.mock.calls[0][1]).toMatchObject({
          secret: undefined,
          expiresIn: undefined,
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
});
