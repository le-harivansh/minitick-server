import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserModule } from '../user/user.module';
import authenticationConfig from './authentication.config';
import { AuthenticationController } from './controller/authentication.controller';
import { TokenRefreshController } from './controller/token-refresh.controller';
import { AuthenticationService } from './service/authentication.service';
import { TokenRefreshService } from './service/token-refresh.service';
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
    TokenRefreshService,
  ],
  controllers: [AuthenticationController, TokenRefreshController],
})
export class AuthenticationModule {}
