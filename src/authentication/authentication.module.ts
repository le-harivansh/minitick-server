import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AuthenticationService } from './authentication.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthenticationController } from './authentication.controller';
import authenticationConfig, {
  AuthenticationConfig,
} from './authentication.config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    ConfigModule.forFeature(authenticationConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authenticationConfig: AuthenticationConfig = {
          jwtSecret: configService.getOrThrow('authentication.jwtSecret'),
          accessTokenDuration: configService.getOrThrow(
            'authentication.accessTokenDuration',
          ),
        };

        return {
          secret: authenticationConfig.jwtSecret,
          signOptions: {
            expiresIn: authenticationConfig.accessTokenDuration,
          },
        };
      },
    }),
  ],
  providers: [AuthenticationService, LocalStrategy, JwtStrategy],
  controllers: [AuthenticationController],
})
export class AuthenticationModule {}
