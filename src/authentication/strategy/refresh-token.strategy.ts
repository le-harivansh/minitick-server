import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { verify } from 'argon2';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserData } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { AuthenticationConfig } from '../authentication.config';
import { REFRESH_TOKEN_KEY } from '../constants';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: ExpressRequest) => request.signedCookies[REFRESH_TOKEN_KEY],
      ]),
      secretOrKey: configService.getOrThrow<
        AuthenticationConfig['refreshTokenSecret']
      >('authentication.refreshTokenSecret'),
    });
  }

  /**
   * @see: AuthenticationService::generateRefreshToken to see the data embedded in the refresh token.
   *
   * @param request The current request.
   * @param payload Receives the payload of the JWT token which is set in AuthenticationService::generateRefreshToken.
   * @returns A user object without the password field.
   */
  async validate(
    request: ExpressRequest,
    { sub: username }: { sub: string },
  ): Promise<UserData> {
    const user = await this.userService.findByUsername(username);

    const filteredRefreshTokens = (
      await Promise.all(
        user.refreshTokens.map(async (token) =>
          (await verify(token.hash, request.signedCookies[REFRESH_TOKEN_KEY]))
            ? token
            : undefined,
        ),
      )
    ).filter(Boolean);

    if (filteredRefreshTokens.length !== 1) {
      throw new InternalServerErrorException();
    }

    if (filteredRefreshTokens[0].expiresOn < new Date()) {
      throw new UnauthorizedException();
    }

    return {
      username: user.username,
    };
  }
}
