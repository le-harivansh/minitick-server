import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { RequestUser } from 'src/user/schema/user.schema';

import { User } from '../../user/decorator/user.decorator';
import { UserService } from '../../user/user.service';
import { RequiresCredentials } from '../guard/local.guard';
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
}
