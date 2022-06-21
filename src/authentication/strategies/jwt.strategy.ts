import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/user/user.schema';
import { AuthenticationConfig } from '../authentication.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<AuthenticationConfig['jwtSecret']>(
        'authentication.jwtSecret',
      ),
    });
  }

  // SEE: AuthenticationService::generateAccessToken to see the data embedded in the access token.
  validate(payload: unknown): Omit<User, 'password'> {
    const { username } = payload as Omit<User, 'password'>;

    return {
      username,
    };
  }
}
