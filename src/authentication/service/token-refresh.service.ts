import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response as ExpressResponse } from 'express';
import ms from 'ms';

import { RequestUser } from '../../user/schema/user.schema';
import { AuthenticationConfiguration } from '../authentication.config';
import {
  ACCESS_TOKEN,
  PASSWORD_CONFIRMATION_TOKEN,
  REFRESH_TOKEN,
} from '../constants';

@Injectable()
export class TokenRefreshService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async attachAccessTokenCookieToResponse(
    user: RequestUser,
    response: ExpressResponse,
  ) {
    const { token, duration } = await this.generateAccessToken(user);

    TokenRefreshService.attachTokenCookieToResponse(
      ACCESS_TOKEN,
      token,
      duration,
      response,
    );

    return {
      expiresAt: Date.now() + duration,
    };
  }

  async attachRefreshTokenCookieToResponse(
    user: RequestUser,
    response: ExpressResponse,
  ) {
    const { token, duration } = await this.generateRefreshToken(user);

    TokenRefreshService.attachTokenCookieToResponse(
      REFRESH_TOKEN,
      token,
      duration,
      response,
    );

    return {
      token,
      expiresAt: Date.now() + duration,
    };
  }

  async attachPasswordConfirmationTokenCookieToResponse(
    user: RequestUser,
    response: ExpressResponse,
  ) {
    const { token, duration } = await this.generatePasswordConfirmationToken(
      user,
    );

    TokenRefreshService.attachTokenCookieToResponse(
      PASSWORD_CONFIRMATION_TOKEN,
      token,
      duration,
      response,
    );

    return {
      expiresAt: Date.now() + duration,
    };
  }

  static clearAccessTokenCookieFromResponse(response: ExpressResponse) {
    TokenRefreshService.clearTokenCookieFromResponse(ACCESS_TOKEN, response);
  }

  static clearRefreshTokenCookieFromResponse(response: ExpressResponse) {
    TokenRefreshService.clearTokenCookieFromResponse(REFRESH_TOKEN, response);
  }

  static clearPasswordConfirmationTokenCookieFromResponse(
    response: ExpressResponse,
  ) {
    TokenRefreshService.clearTokenCookieFromResponse(
      PASSWORD_CONFIRMATION_TOKEN,
      response,
    );
  }

  private async generateAccessToken({ id: userId }: RequestUser) {
    const accessTokenDuration = this.configService.getOrThrow<
      AuthenticationConfiguration['jwt']['accessToken']['duration']
    >('authentication.jwt.accessToken.duration');

    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['accessToken']['secret']
        >('authentication.jwt.accessToken.secret'),
        expiresIn: accessTokenDuration,
      },
    );

    return {
      token: accessToken,
      duration: ms(accessTokenDuration),
    };
  }

  private async generateRefreshToken({ id: userId }: RequestUser) {
    const refreshTokenDuration = this.configService.getOrThrow<
      AuthenticationConfiguration['jwt']['refreshToken']['duration']
    >('authentication.jwt.refreshToken.duration');

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['refreshToken']['secret']
        >('authentication.jwt.refreshToken.secret'),
        expiresIn: refreshTokenDuration,
      },
    );

    return {
      token: refreshToken,
      duration: ms(refreshTokenDuration),
    };
  }

  private async generatePasswordConfirmationToken({ id: userId }: RequestUser) {
    const passwordConfirmationTokenDuration = this.configService.getOrThrow<
      AuthenticationConfiguration['jwt']['passwordConfirmationToken']['duration']
    >('authentication.jwt.passwordConfirmationToken.duration');

    const passwordConfirmationToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['passwordConfirmationToken']['secret']
        >('authentication.jwt.passwordConfirmationToken.secret'),
        expiresIn: passwordConfirmationTokenDuration,
      },
    );

    return {
      token: passwordConfirmationToken,
      duration: ms(passwordConfirmationTokenDuration),
    };
  }

  private static attachTokenCookieToResponse(
    cookieName: string,
    cookieValue: unknown,
    maxAge: number,
    response: ExpressResponse,
  ) {
    response.cookie(cookieName, cookieValue, {
      secure: true,
      httpOnly: true,
      signed: true,
      maxAge,
      sameSite: 'lax',
    });
  }

  private static clearTokenCookieFromResponse(
    cookieName: string,
    response: ExpressResponse,
  ) {
    response.clearCookie(cookieName, {
      secure: true,
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
    });
  }
}
