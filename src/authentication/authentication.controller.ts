import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { LocalAuthenticationGuard } from './guards/local-authentication.guard';
import { JwtAuthenticationGuard } from './guards/jwt-authentication.guard';
import { Request as ExpressRequest } from 'express';
import { User } from 'src/user/user.schema';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @UseGuards(LocalAuthenticationGuard)
  @Post('login')
  login(@Request() request: ExpressRequest) {
    return {
      access_token: this.authenticationService.generateAccessToken(
        request.user as Omit<User, 'password'>,
      ),
    };
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('status')
  getStatus() {
    return undefined;
  }
}
