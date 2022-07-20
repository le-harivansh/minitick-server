import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';

import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
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

    authenticationService = module.get<AuthenticationService>(
      AuthenticationService,
    );
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
