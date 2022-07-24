import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';

import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService (unit)', () => {
  describe('validateCredentials', () => {
    let authenticationService: AuthenticationService;
    let userService: UserService;
    let user: Pick<User, 'username' | 'password'>;

    const plainPassword = 'This!$my_p@ssw0rD';

    beforeAll(async () => {
      user = {
        username: 'OneTwo',
        password: await hash(plainPassword, { type: argon2id }),
      };

      userService = {
        findByUsername: jest.fn(() => user),
      } as unknown as UserService;
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [JwtModule, ConfigModule],
        providers: [
          {
            provide: UserService,
            useValue: userService,
          },
          AuthenticationService,
        ],
      }).compile();

      authenticationService = module.get(AuthenticationService);
    });

    it('returns a user if valid credentials are passed', async () => {
      const userData = await authenticationService.validateCredentials(
        user.username,
        plainPassword,
      );

      expect(userData).toMatchObject({ username: user.username });
    });

    it('returns undefined if invalid credentials are passed', async () => {
      const userData = await authenticationService.validateCredentials(
        user.username,
        'wrong_password',
      );

      expect(userData).toBeUndefined();
    });
  });

  describe('generateTokens', () => {
    let authenticationService: AuthenticationService;
    const jwtService = { sign: jest.fn() };
    const configService = { getOrThrow: jest.fn() };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: UserService,
            useValue: jest.fn(),
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
          AuthenticationService,
        ],
      }).compile();

      authenticationService = module.get(AuthenticationService);
    });

    afterEach(() => {
      jwtService.sign.mockClear();
      configService.getOrThrow.mockClear();
    });

    test('generateAccessToken calls the jwtService with the correct arguments', () => {
      const username = 'OneTwo';

      authenticationService.generateAccessToken({ username });

      expect(jwtService.sign).toHaveBeenCalledTimes(1);

      expect(jwtService.sign.mock.calls[0][0]).toMatchObject({ sub: username });
      expect(jwtService.sign.mock.calls[0][1]).toMatchObject({
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

    test('generateRefreshToken calls the jwtService with the correct arguments', () => {
      const username = 'ThreeFour';

      authenticationService.generateRefreshToken({ username });

      expect(jwtService.sign).toHaveBeenCalledTimes(1);

      expect(jwtService.sign.mock.calls[0][0]).toMatchObject({ sub: username });
      expect(jwtService.sign.mock.calls[0][1]).toMatchObject({
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
