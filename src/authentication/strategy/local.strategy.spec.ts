import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../../user/user.service';
import { AuthenticationService } from '../service/authentication.service';
import { LocalStrategy } from './local.strategy';

describe(LocalStrategy.name, () => {
  let localStrategy: LocalStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthenticationService,
          useValue: {
            credentialsAreValid(username: string, password: string) {
              return username === 'username' && password === 'password'
                ? { username }
                : undefined;
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            async findByUsername(username: string) {
              return username === 'username'
                ? { _id: '101010', username: 'username' }
                : null;
            },
          },
        },
      ],
    }).compile();

    localStrategy = module.get(LocalStrategy);
  });

  describe('validate', () => {
    describe('when called', () => {
      test("it returns the corresponding user's data when correct credentials are provided", async () => {
        expect(
          await localStrategy.validate('username', 'password'),
        ).toMatchObject({
          id: '101010',
          username: 'username',
        });
      });

      test('it throws an unauthorized exception when incorrect credentials are provided', async () => {
        expect(async () =>
          localStrategy.validate('wrong_username', 'wrong_password'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });
});
