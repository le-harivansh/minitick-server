import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';

import { User, UserData } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationConfig } from './authentication.config';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserData | undefined> {
    const retrievedUser = await this.userService.findByUsername(username);

    if (retrievedUser && (await verify(retrievedUser.password, password))) {
      const { username } = retrievedUser;

      return {
        username,
      };
    }
  }

  generateAccessToken({ username }: Pick<User, 'username'>) {
    return this.jwtService.sign(
      { sub: username },
      {
        secret: this.configService.get<
          AuthenticationConfig['accessTokenSecret']
        >('authentication.accessTokenSecret'),
        expiresIn: this.configService.get<
          AuthenticationConfig['accessTokenDuration']
        >('authentication.accessTokenDuration'),
      },
    );
  }

  generateRefreshToken({ username }: Pick<User, 'username'>) {
    return this.jwtService.sign(
      { sub: username },
      {
        secret: this.configService.get<
          AuthenticationConfig['refreshTokenSecret']
        >('authentication.refreshTokenSecret'),
        expiresIn: this.configService.get<
          AuthenticationConfig['refreshTokenDuration']
        >('authentication.refreshTokenDuration'),
      },
    );
  }
}
