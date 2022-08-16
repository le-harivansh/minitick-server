import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';

import { AuthenticationConfiguration } from '../authentication.config';
import { ACCESS_TOKEN, PASSWORD_CONFIRMATION_TOKEN } from '../constants';

@Injectable()
export class RequiresPasswordConfirmationToken implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: ExpressRequest = context.switchToHttp().getRequest();

    const accessToken: string = request.signedCookies[ACCESS_TOKEN];
    const passwordConfirmationToken: string =
      request.signedCookies[PASSWORD_CONFIRMATION_TOKEN];

    if (!accessToken || !passwordConfirmationToken) {
      return false;
    }

    const accessTokenSecret = this.configService.getOrThrow<
      AuthenticationConfiguration['jwt']['accessToken']['secret']
    >('authentication.jwt.accessToken.secret');
    const passwordConfirmationTokenSecret = this.configService.getOrThrow<
      AuthenticationConfiguration['jwt']['passwordConfirmationToken']['secret']
    >('authentication.jwt.passwordConfirmationToken.secret');

    let accessTokenUserId: string;
    let passwordConfirmationTokenUserId: string;

    try {
      accessTokenUserId = (
        await this.jwtService.verifyAsync<{ sub: string }>(accessToken, {
          secret: accessTokenSecret,
        })
      ).sub;
      passwordConfirmationTokenUserId = (
        await this.jwtService.verifyAsync<{ sub: string }>(
          passwordConfirmationToken,
          { secret: passwordConfirmationTokenSecret },
        )
      ).sub;
    } catch {
      return false;
    }

    return (
      !!accessTokenUserId &&
      !!passwordConfirmationTokenUserId &&
      accessTokenUserId === passwordConfirmationTokenUserId
    );
  }
}
