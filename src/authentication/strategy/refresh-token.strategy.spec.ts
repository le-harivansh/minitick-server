import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';
import { Request as ExpressRequest } from 'express';
import { ObjectId } from 'mongodb';

import { HashedRefreshToken } from '../../user/schema/hashed-refresh-token.schema';
import { User } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { REFRESH_TOKEN } from '../constants';
import { RefreshTokenStrategy } from './refresh-token.strategy';

describe(RefreshTokenStrategy.name, () => {
  describe('tokenIsValid', () => {
    const plainTokens = ['first token', 'second token', 'another token'];
    const hashedTokens: string[] = [];

    beforeAll(async () => {
      for (const plainToken of plainTokens) {
        hashedTokens.push(await hash(plainToken, { type: argon2id }));
      }
    });

    it("returns true when a token's hash is present in the provided hash-array", async () => {
      expect(
        RefreshTokenStrategy['tokenIsValid'](plainTokens[1], hashedTokens),
      ).resolves.toBe(true);
    });

    test("it returns false when a token's hash is absent from the provided hash-array", async () => {
      expect(
        RefreshTokenStrategy['tokenIsValid']('invalid token', hashedTokens),
      ).resolves.toBe(false);
    });
  });

  describe('validate', () => {
    let refreshTokenStrategy: RefreshTokenStrategy;

    const plainRefreshTokens = ['token-one', 'token-two', 'another-token'];
    const hashedRefreshTokens: HashedRefreshToken[] = [];

    const user: Pick<User, 'username' | 'hashedRefreshTokens'> & {
      _id: string;
    } = {
      _id: new ObjectId().toJSON(),
      username: 'le-username',
      hashedRefreshTokens,
    };

    const createRequest = (token: string) =>
      ({ signedCookies: { [REFRESH_TOKEN]: token } } as ExpressRequest);

    beforeAll(async () => {
      for (const plainRefreshToken of plainRefreshTokens) {
        hashedRefreshTokens.push({
          hash: await hash(plainRefreshToken, { type: argon2id }),
          expiresOn: new Date(),
        });
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RefreshTokenStrategy,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: () => 'REFRESH_TOKEN_SECRET',
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

      refreshTokenStrategy = module.get(RefreshTokenStrategy);
    });

    it("returns the user's data when a valid refresh-token is present in the request cookies", () => {
      expect(
        refreshTokenStrategy.validate(createRequest(plainRefreshTokens[1]), {
          sub: user._id,
        }),
      ).resolves.toMatchObject({ id: user._id, username: user.username });
    });

    it("throws an UnauthorizedException if the provided user's id is invalid", () => {
      expect(
        refreshTokenStrategy.validate(createRequest(plainRefreshTokens[0]), {
          sub: null,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws an UnauthorizedException if the provided refresh-token is invalid', () => {
      expect(
        refreshTokenStrategy.validate(createRequest('invalid-token'), {
          sub: user._id,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
