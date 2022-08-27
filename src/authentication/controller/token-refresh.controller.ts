import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { User } from '../../user/decorator/user.decorator';
import { RequestUser } from '../../user/schema/user.schema';
import { UserService } from '../../user/user.service';
import { RegeneratePasswordConfirmationTokenDto } from '../dto/regenerate-password-confirmation-token.dto';
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
  @HttpCode(HttpStatus.OK)
  async regenerateAccessToken(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    return this.tokenService.attachAccessTokenCookieToResponse(user, response);
  }

  @Get('refresh-token')
  @UseGuards(RequiresRefreshToken)
  @HttpCode(HttpStatus.OK)
  async regenerateRefreshToken(
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    const { token: refreshToken, expiresAt } =
      await this.tokenService.attachRefreshTokenCookieToResponse(
        user,
        response,
      );

    await this.userService.saveHashedRefreshToken(user.id, refreshToken);

    return { expiresAt };
  }

  @Post('password-confirmation-token')
  @UseGuards(RequiresAccessToken)
  @UsePipes(ValidationPipe)
  @HttpCode(HttpStatus.OK)
  async regeneratePasswordConfirmationToken(
    @Body() { password }: RegeneratePasswordConfirmationTokenDto,
    @User() user: RequestUser,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    if (
      !(await this.authenticationService.credentialsAreValid(
        user.username,
        password,
      ))
    ) {
      throw new ForbiddenException();
    }

    return this.tokenService.attachPasswordConfirmationTokenCookieToResponse(
      user,
      response,
    );
  }
}
