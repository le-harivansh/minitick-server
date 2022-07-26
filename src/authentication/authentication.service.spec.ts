import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';

import { UserService } from '../user/user.service';
import { AuthenticationService } from './authentication.service';

describe(AuthenticationService.name, () => {
  const userData = { username: 'OneTwo', password: 'onetwo' };
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
                case userData.username:
                  return {
                    username: userData.username,
                    password: await hash(userData.password, { type: argon2id }),
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

  describe('validateCredentials', () => {
    describe('when called', () => {
      test('it returns a user if its credentials are passed', async () => {
        expect(
          authenticationService.validateCredentials(
            userData.username,
            userData.password,
          ),
        ).resolves.toMatchObject({ username: userData.username });
      });

      test('it returns undefined if invalid user-credentials are passed', async () => {
        expect(
          authenticationService.validateCredentials(
            userData.username,
            'wrong-password',
          ),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('generateAccessToken', () => {
    describe('when called', () => {
      test('it calls the resolved `JwtService` with the correct arguments', async () => {
        await authenticationService.generateAccessToken({
          username: userData.username,
        });

        expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

        expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
          sub: userData.username,
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
        await authenticationService.generateRefreshToken({
          username: userData.username,
        });

        expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

        expect(jwtService.signAsync.mock.calls[0][0]).toMatchObject({
          sub: userData.username,
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
