import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../../user/user.service';
import { AccessTokenStrategy } from './access-token.strategy';

describe('AccessTokenStrategy (unit)', () => {
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

  it('returns valid user data', async () => {
    expect(
      await accessTokenStrategy.validate({ sub: 'username' }),
    ).toMatchObject({
      username: 'username',
    });
  });
});
