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
import { AuthenticationConfiguration } from './authentication.config';
import { AuthenticationService } from './authentication.service';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import { RequiresCredentials } from './guard/local.guard';
import { RequiresRefreshToken } from './guard/refresh-token.guard';

@Controller('authentication')
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
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.regenerateTokens(request, response);
  }

  @Get('refresh-tokens')
  @UseGuards(RequiresRefreshToken)
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

    const accessToken = await this.authenticationService.generateAccessToken(
      user,
    );
    const refreshToken = await this.authenticationService.generateRefreshToken(
      user,
    );

    await this.userService.saveRefreshToken(user.username, refreshToken);

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
