import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { User } from '../../user/decorator/user.decorator';
import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { RefreshPasswordConfirmationTokenDto } from '../dto/refresh-password-confirmation-token.dto';
import { RequiresAccessToken } from '../guard/access-token.guard';
import { RequiresRefreshToken } from '../guard/refresh-token.guard';
import { AuthenticationService } from '../service/authentication.service';
import { TokenRefreshService } from '../service/token-refresh.service';

@Controller('refresh')
export class TokenRefreshController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly tokenService: TokenRefreshService,
    private readonly userService: UserService,
  ) {}

  @Get('access-token')
  @UseGuards(RequiresRefreshToken)
  @HttpCode(HttpStatus.NO_CONTENT)
  async regenerateAccessToken(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.tokenService.attachAccessTokenCookieToResponse(user, response);
  }

  @Get('refresh-token')
  @UseGuards(RequiresRefreshToken)
  @HttpCode(HttpStatus.NO_CONTENT)
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

  @Post('password-confirmation-token')
  @UseGuards(RequiresAccessToken)
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.NO_CONTENT)
  async regeneratePasswordConfirmationToken(
    @Body() { password }: RefreshPasswordConfirmationTokenDto,
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    if (
      !(await this.authenticationService.credentialsAreValid(
        user.username,
        password,
      ))
    ) {
      throw new UnauthorizedException();
    }

    await this.tokenService.attachPasswordConfirmationTokenCookieToResponse(
      user,
      response,
    );
  }
}
