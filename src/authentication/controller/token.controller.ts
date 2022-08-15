import { Controller, Get, UseGuards } from '@nestjs/common';
import { Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { User } from '../../user/decorator/user.decorator';
import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { RequiresRefreshToken } from '../guard/refresh-token.guard';
import { TokenService } from '../service/token.service';

@Controller()
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  @Get('/refresh/access-token')
  @UseGuards(RequiresRefreshToken)
  async regenerateAccessToken(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.tokenService.attachAccessTokenCookieToResponse(user, response);
  }

  @Get('/refresh/refresh-token')
  @UseGuards(RequiresRefreshToken)
  async regenerateRefreshToken(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    const refreshToken =
      await this.tokenService.attachRefreshTokenCookieToResponse(
        user,
        response,
      );

    await this.userService.saveHashedRefreshToken(user.id, refreshToken);
  }
}
