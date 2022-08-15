import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserModule } from '../user/user.module';
import authenticationConfig from './authentication.config';
import { AuthenticationController } from './controller/authentication.controller';
import { TokenController } from './controller/token.controller';
import { AuthenticationService } from './service/authentication.service';
import { TokenService } from './service/token.service';
import { AccessTokenStrategy } from './strategy/access-token.strategy';
import { LocalStrategy } from './strategy/local.strategy';
import { RefreshTokenStrategy } from './strategy/refresh-token.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    ConfigModule.forFeature(authenticationConfig),
    JwtModule.register({}),
  ],
  providers: [
    AuthenticationService,
    LocalStrategy,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    TokenService,
  ],
  controllers: [AuthenticationController, TokenController],
})
export class AuthenticationModule {}
