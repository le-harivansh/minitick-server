import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import ms from 'ms';
import { UserData } from 'src/user/schema/user.schema';

import { UserService } from '../user/user.service';
import { AuthenticationConfig } from './authentication.config';
import { AuthenticationService } from './authentication.service';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants';
import { RequiresAccessToken } from './guard/access-token.guard';
import { RequiresCredentials } from './guard/local.guard';
import { RequiresRefreshToken } from './guard/refresh-token.guard';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(RequiresCredentials)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.regenerateTokens(request, response);
  }

  /**
   * @Deprecated
   *
   * @todo: Remove when no longer needed.
   */
  @UseGuards(RequiresAccessToken)
  @Get('status')
  getStatus() {
    return undefined;
  }

  @UseGuards(RequiresRefreshToken)
  @Get('refresh')
  async refresh(
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.regenerateTokens(request, response);
  }

  private async regenerateTokens(
    request: ExpressRequest,
    response: ExpressResponse,
  ) {
    const user = request.user as UserData;

    const accessToken = this.authenticationService.generateAccessToken(user);

    const refreshToken = this.authenticationService.generateRefreshToken(user);

    await this.userService.saveRefreshToken(user.username, refreshToken);

    response.cookie(ACCESS_TOKEN_KEY, accessToken, {
      secure: true,
      httpOnly: true,
      signed: true,
      maxAge: ms(
        this.configService.getOrThrow<
          AuthenticationConfig['accessTokenDuration']
        >('authentication.accessTokenDuration'),
      ),
      sameSite: 'lax',
    });

    response.cookie(REFRESH_TOKEN_KEY, refreshToken, {
      secure: true,
      httpOnly: true,
      signed: true,
      maxAge: ms(
        this.configService.getOrThrow<
          AuthenticationConfig['refreshTokenDuration']
        >('authentication.refreshTokenDuration'),
      ),
      sameSite: 'lax',
    });
  }
}
