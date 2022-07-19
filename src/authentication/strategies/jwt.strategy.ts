import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request as ExpressRequest } from 'express';
import { User } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { AuthenticationConfig } from '../authentication.config';
import { ACCESS_TOKEN_KEY } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: ExpressRequest) => request.signedCookies[ACCESS_TOKEN_KEY],
      ]),
      secretOrKey: configService.getOrThrow<AuthenticationConfig['jwtSecret']>(
        'authentication.jwtSecret',
      ),
    });
  }

  /**
   * @see: AuthenticationService::generateAccessToken to see the data embedded in the access token.
   *
   * @param Receives the payload of the JWT token which is set in AuthenticationService::generateAccessToken.
   * @returns A user object without the password field.
   */
  async validate({
    sub: username,
  }: {
    sub: string;
  }): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByUsername(username);

    return {
      username: user.username,
    };
  }
}
