import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';

import { UserData } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationConfiguration } from './authentication.config';

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

  async generateAccessToken({ username }: Pick<UserData, 'username'>) {
    return this.jwtService.signAsync(
      { sub: username },
      {
        secret: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['accessToken']['secret']
        >('authentication.jwt.accessToken.secret'),
        expiresIn: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['accessToken']['duration']
        >('authentication.jwt.accessToken.duration'),
      },
    );
  }

  async generateRefreshToken({ username }: Pick<UserData, 'username'>) {
    return this.jwtService.signAsync(
      { sub: username },
      {
        secret: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['refreshToken']['secret']
        >('authentication.jwt.refreshToken.secret'),
        expiresIn: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['refreshToken']['duration']
        >('authentication.jwt.refreshToken.duration'),
      },
    );
  }
}
