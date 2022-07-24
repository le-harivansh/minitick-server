import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthenticationService } from '../authentication.service';
import { LOCAL_GUARD } from '../constants';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, LOCAL_GUARD) {
  constructor(private readonly authenticationService: AuthenticationService) {
    super();
  }

  async validate(username: string, password: string) {
    const userData = await this.authenticationService.validateCredentials(
      username,
      password,
    );

    if (!userData) {
      throw new UnauthorizedException();
    }

    return userData;
  }
}
