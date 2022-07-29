import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
import ms from 'ms';
import { RequestUser } from 'src/user/schema/user.schema';

import { User } from '../user/decorator/user.decorator';
import { UserService } from '../user/user.service';
import { AuthenticationConfiguration } from './authentication.config';
import { AuthenticationService } from './authentication.service';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import { RequiresCredentials } from './guard/local.guard';
import { RequiresRefreshToken } from './guard/refresh-token.guard';

@Controller()
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(RequiresCredentials)
  @HttpCode(HttpStatus.OK)
  async login(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.regenerateTokens(user, response);
  }

  @Get('refresh-tokens')
  @UseGuards(RequiresRefreshToken)
  async refresh(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.regenerateTokens(user, response);
  }

  private async regenerateTokens(user: RequestUser, response: ExpressResponse) {
    const accessToken = await this.authenticationService.generateAccessToken(
      user,
    );
    const refreshToken = await this.authenticationService.generateRefreshToken(
      user,
    );

    await this.userService.saveHashedRefreshToken(user.id, refreshToken);

    response.cookie(ACCESS_TOKEN, accessToken, {
      secure: true,
      httpOnly: true,
      signed: true,
      maxAge: ms(
        this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['accessToken']['duration']
        >('authentication.jwt.accessToken.duration'),
      ),
      sameSite: 'lax',
    });

    response.cookie(REFRESH_TOKEN, refreshToken, {
      secure: true,
      httpOnly: true,
      signed: true,
      maxAge: ms(
        this.configService.getOrThrow<
          AuthenticationConfiguration['jwt']['refreshToken']['duration']
        >('authentication.jwt.refreshToken.duration'),
      ),
      sameSite: 'lax',
    });
  }
}
