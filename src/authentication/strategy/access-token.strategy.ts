import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { AuthenticationConfiguration } from '../authentication.config';
import { ACCESS_TOKEN, ACCESS_TOKEN_GUARD } from '../constants';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  ACCESS_TOKEN_GUARD,
) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: ExpressRequest) => request.signedCookies[ACCESS_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<
        AuthenticationConfiguration['jwt']['accessToken']['secret']
      >('authentication.jwt.accessToken.secret'),
    });
  }

  /**
   * @see: AuthenticationService::generateAccessToken to see the data embedded in the access token.
   *
   * @param Receives the payload of the JWT token which is set in AuthenticationService::generateAccessToken.
   * @returns The user object which will be attached to request.user.
   */
  async validate({
    sub: authenticatedUserId,
  }: {
    sub: string;
  }): Promise<RequestUser> {
    const { username } = await this.userService.findById(authenticatedUserId);

    return { id: authenticatedUserId, username };
  }
}
