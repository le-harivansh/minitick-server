import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';

import { RequestUser } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthenticationConfiguration } from './authentication.config';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async credentialsAreValid(username: string, password: string) {
    const retrievedUser = await this.userService.findByUsername(username);

    return retrievedUser && (await verify(retrievedUser.password, password));
  }

  async generateAccessToken({ id: userId }: RequestUser) {
    return this.jwtService.signAsync(
      { sub: userId },
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

  async generateRefreshToken({ id: userId }: RequestUser) {
    return this.jwtService.signAsync(
      { sub: userId },
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
