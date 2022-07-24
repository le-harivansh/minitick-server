import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';
import { Request as ExpressRequest } from 'express';

import { HashedRefreshToken } from '../../user/schema/hashed-refresh-token.schema';
import { UserService } from '../../user/user.service';
import { REFRESH_TOKEN } from '../constants';
import { RefreshTokenStrategy } from './refresh-token.strategy';

describe('RefreshTokenStrategy (unit)', () => {
  describe('tokenIsValid', () => {
    const plainTokens = ['first token', 'second token', 'another token'];
    const hashedTokens: string[] = [];

    beforeAll(async () => {
      for await (const plainToken of plainTokens) {
        hashedTokens.push(await hash(plainToken, { type: argon2id }));
      }
    });

    it("returns true when a token's hash is present in the provided hash-array", async () => {
      expect(
        RefreshTokenStrategy['tokenIsValid'](plainTokens[1], hashedTokens),
      ).resolves.toBeTruthy();
    });

    it("returns false when a token's hash is absent from the provided hash-array", async () => {
      expect(
        RefreshTokenStrategy['tokenIsValid']('invalid token', hashedTokens),
      ).resolves.toBeFalsy();
    });
  });

  describe('validate', () => {
    let refreshTokenStrategy: RefreshTokenStrategy;

    const plainRefreshTokens = ['token-one', 'token-two', 'another-token'];
    const hashedRefreshTokens: HashedRefreshToken[] = [];

    const createRequest = (token: string) =>
      ({
        signedCookies: {
          [REFRESH_TOKEN]: token,
        },
      } as ExpressRequest);

    beforeAll(async () => {
      for await (const plainRefreshToken of plainRefreshTokens) {
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
              findByUsername: (username: string) => ({
                username,
                hashedRefreshTokens,
              }),
            },
          },
        ],
      }).compile();

      refreshTokenStrategy = module.get(RefreshTokenStrategy);
    });

    it("returns the user's data when a valid refresh-token is present in the request cookies", () => {
      const username = 'username';

      expect(
        refreshTokenStrategy.validate(createRequest(plainRefreshTokens[1]), {
          sub: username,
        }),
      ).resolves.toMatchObject({ username });
    });

    it('throws an UnauthorizedException if the provided refresh-token is invalid', () => {
      expect(
        refreshTokenStrategy.validate(createRequest('invalid-token'), {
          sub: 'le-user',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
