import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { verify } from 'argon2';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserData } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { AuthenticationConfiguration } from '../authentication.config';
import { REFRESH_TOKEN, REFRESH_TOKEN_GUARD } from '../constants';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  REFRESH_TOKEN_GUARD,
) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: ExpressRequest) => request.signedCookies[REFRESH_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<
        AuthenticationConfiguration['jwt']['refreshToken']['secret']
      >('authentication.jwt.refreshToken.secret'),
    });
  }

  /**
   * @see: AuthenticationService::generateRefreshToken to see the data embedded in the refresh token.
   *
   * @param request The current request.
   * @param payload Receives the payload of the JWT token which is set in AuthenticationService::generateRefreshToken.
   * @returns A user object without any 'private' fields (password, hashedRefreshTokens, etc...).
   */
  async validate(
    request: ExpressRequest,
    { sub: authenticatedUserUsername }: { sub: string },
  ): Promise<UserData> {
    const { username, hashedRefreshTokens } =
      await this.userService.findByUsername(authenticatedUserUsername);

    if (
      !(await RefreshTokenStrategy.tokenIsValid(
        request.signedCookies[REFRESH_TOKEN],
        hashedRefreshTokens.map(({ hash }) => hash),
      ))
    ) {
      throw new UnauthorizedException();
    }

    return { username };
  }

  private static async tokenIsValid(
    plain: string,
    hashes: string[],
  ): Promise<boolean> {
    return (
      await Promise.all(hashes.map(async (hash) => await verify(hash, plain)))
    ).some(Boolean);
  }
}
