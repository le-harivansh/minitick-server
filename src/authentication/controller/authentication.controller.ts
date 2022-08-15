import {
  Controller,
  Delete,
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
import { RequestUser } from 'src/user/schema/user.schema';

import { User } from '../../user/decorator/user.decorator';
import { UserService } from '../../user/user.service';
import { REFRESH_TOKEN } from '../constants';
import { RequiresCredentials } from '../guard/local.guard';
import { RequiresRefreshToken } from '../guard/refresh-token.guard';
import { TokenService } from '../service/token.service';

@Controller()
export class AuthenticationController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('login')
  @UseGuards(RequiresCredentials)
  @HttpCode(HttpStatus.OK)
  async login(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.tokenService.attachAccessTokenCookieToResponse(user, response);

    const refreshToken =
      await this.tokenService.attachRefreshTokenCookieToResponse(
        user,
        response,
      );

    await this.userService.saveHashedRefreshToken(user.id, refreshToken);
  }

  @Delete('logout')
  @UseGuards(RequiresRefreshToken)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @User('id') userId: string,
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    TokenService.clearAccessTokenCookieFromResponse(response);
    TokenService.clearRefreshTokenCookieFromResponse(response);

    await this.userService.removeHashedRefreshToken(
      userId,
      request.signedCookies[REFRESH_TOKEN],
    );
  }
}
