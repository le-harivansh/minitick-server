import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthenticationService } from '../authentication.service';
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
            validateCredentials(username: string, password: string) {
              return username === 'username' && password === 'password'
                ? { username }
                : undefined;
            },
          },
        },
      ],
    }).compile();

    localStrategy = module.get(LocalStrategy);
  });

  describe('validate', () => {
    describe('when called', () => {
      test('it returns valid UserData when the correct credentials are provided', async () => {
        expect(
          await localStrategy.validate('username', 'password'),
        ).toMatchObject({
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
