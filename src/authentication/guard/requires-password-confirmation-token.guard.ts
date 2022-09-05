import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';

import { RequestUser } from '../../user/schema/user.schema';
import { AuthenticationConfiguration } from '../authentication.config';
import { PASSWORD_CONFIRMATION_TOKEN } from '../constants';

@Injectable()
export class RequiresPasswordConfirmationToken implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: ExpressRequest = context.switchToHttp().getRequest();

    const authenticatedUser = request.user as RequestUser;
    const passwordConfirmationToken: string =
      request.signedCookies[PASSWORD_CONFIRMATION_TOKEN];

    let passwordConfirmationTokenUserId: string;

    try {
      const passwordConfirmationTokenSecret = this.configService.getOrThrow<
        AuthenticationConfiguration['jwt']['passwordConfirmationToken']['secret']
      >('authentication.jwt.passwordConfirmationToken.secret');

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
      !!authenticatedUser &&
      authenticatedUser.id === passwordConfirmationTokenUserId
    );
  }
}
