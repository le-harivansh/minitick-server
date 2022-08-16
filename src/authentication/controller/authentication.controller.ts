import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { RequestUser } from 'src/user/schema/user.schema';

import { User } from '../../user/decorator/user.decorator';
import { UserService } from '../../user/user.service';
import { REFRESH_TOKEN } from '../constants';
import { LogoutDto, LogoutScope } from '../dto/logout.dto';
import { RequiresAccessToken } from '../guard/access-token.guard';
import { RequiresCredentials } from '../guard/local.guard';
import { TokenRefreshService } from '../service/token-refresh.service';

@Controller()
export class AuthenticationController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenRefreshService,
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

    await this.tokenService.attachPasswordConfirmationTokenCookieToResponse(
      user,
      response,
    );

    return user;
  }

  @Delete('logout')
  @UseGuards(RequiresAccessToken)
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @User('id') userId: string,
    @Body() { scope = LogoutScope.CURRENT_SESSION }: LogoutDto,
    @Request() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    const refreshToken: string = request.signedCookies[REFRESH_TOKEN];

    if (scope === LogoutScope.OTHER_SESSIONS) {
      return await this.userService.removeAllOtherHashedRefreshTokens(
        userId,
        refreshToken,
      );
    }

    // At this point, we know that: scope == LogoutScope.CURRENT_SESSION

    /**
     * If the user has an access-token, it is implied that it has a refresh-token too.
     * Therefore, the following should not fail if this route is called correctly.
     */
    await this.userService.removeHashedRefreshToken(userId, refreshToken);

    TokenRefreshService.clearAccessTokenCookieFromResponse(response);
    TokenRefreshService.clearRefreshTokenCookieFromResponse(response);
    TokenRefreshService.clearPasswordConfirmationTokenCookieFromResponse(
      response,
    );
  }
}
