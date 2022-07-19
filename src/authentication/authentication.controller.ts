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
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import * as ms from 'ms';
import { AuthenticationService } from './authentication.service';
import { RequiresCredentials } from './guards/local-authentication.guard';
import { RequiresAccessToken } from './guards/jwt/access-token-authentication.guard';
import { User } from 'src/user/user.schema';
import { ACCESS_TOKEN_KEY } from './constants';
import { ConfigService } from '@nestjs/config';
import { AuthenticationConfig } from './authentication.config';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(RequiresCredentials)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    const accessToken = this.authenticationService.generateAccessToken(
      request.user as Omit<User, 'password'>,
    );

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
  }

  @UseGuards(RequiresAccessToken)
  @Get('status')
  getStatus() {
    return undefined;
  }
}
