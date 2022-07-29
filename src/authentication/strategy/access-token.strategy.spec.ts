import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';

import { User } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { AccessTokenStrategy } from './access-token.strategy';

describe(AccessTokenStrategy.name, () => {
  let accessTokenStrategy: AccessTokenStrategy;

  const user: Pick<User, 'username'> & { _id: string } = {
    _id: new ObjectId().toJSON(),
    username: 'le-username',
  };

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
            findById: (userId: string) => (userId === user._id ? user : null),
          },
        },
      ],
    }).compile();

    accessTokenStrategy = module.get(AccessTokenStrategy);
  });

  describe('validate', () => {
    describe('when called', () => {
      test('it returns valid user data', async () => {
        expect(
          accessTokenStrategy.validate({ sub: user._id }),
        ).resolves.toMatchObject({
          id: user._id,
          username: user.username,
        });
      });
    });
  });
});
