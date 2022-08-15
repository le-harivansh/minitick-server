import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response as ExpressResponse } from 'express';
import ms from 'ms';

import { RequestUser } from '../../user/schema/user.schema';
import { AuthenticationConfiguration } from '../authentication.config';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async attachAccessTokenCookieToResponse(
    user: RequestUser,
    response: ExpressResponse,
  ) {
    const accessToken = await this.generateAccessToken(user);

    TokenService.attachTokenCookieToResponse(
      ACCESS_TOKEN,
      accessToken,
      ms(
        this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['accessToken']['duration']
        >('authentication.jwt.accessToken.duration'),
      ),
      response,
    );
  }

  async attachRefreshTokenCookieToResponse(
    user: RequestUser,
    response: ExpressResponse,
  ) {
    const refreshToken = await this.generateRefreshToken(user);

    TokenService.attachTokenCookieToResponse(
      REFRESH_TOKEN,
      refreshToken,
      ms(
        this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['refreshToken']['duration']
        >('authentication.jwt.refreshToken.duration'),
      ),
      response,
    );

    return refreshToken;
  }

  static clearAccessTokenCookieFromResponse(response: ExpressResponse) {
    TokenService.clearTokenCookieFromResponse(ACCESS_TOKEN, response);
  }

  static clearRefreshTokenCookieFromResponse(response: ExpressResponse) {
    TokenService.clearTokenCookieFromResponse(REFRESH_TOKEN, response);
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

  static attachTokenCookieToResponse(
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

  static clearTokenCookieFromResponse(
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
