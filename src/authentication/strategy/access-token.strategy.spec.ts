import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../../user/user.service';
import { AccessTokenStrategy } from './access-token.strategy';

describe(AccessTokenStrategy.name, () => {
  let accessTokenStrategy: AccessTokenStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => key,
          },
        },
        {
          provide: UserService,
          useValue: {
            findByUsername: (username: string) => ({ username }),
          },
        },
      ],
    }).compile();

    accessTokenStrategy = module.get(AccessTokenStrategy);
  });

  describe('validate', () => {
    describe('when called', () => {
      test('it returns valid user data', async () => {
        const username = 'le-username';

        expect(
          accessTokenStrategy.validate({ sub: username }),
        ).resolves.toMatchObject({ username });
      });
    });
  });
});
