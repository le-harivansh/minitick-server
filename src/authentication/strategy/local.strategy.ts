import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { LOCAL_GUARD } from '../constants';
import { AuthenticationService } from '../service/authentication.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, LOCAL_GUARD) {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async validate(username: string, password: string): Promise<RequestUser> {
    if (
      !(await this.authenticationService.credentialsAreValid(
        username,
        password,
      ))
    ) {
      throw new UnauthorizedException();
    }

    const { _id: id } = await this.userService.findByUsername(username);

    return { id, username };
  }
}
