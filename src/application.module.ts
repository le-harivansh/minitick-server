import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { DatabaseModule } from './database/database.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { RegistrationModule } from './registration/registration.module';
import applicationConfig, { ApplicationConfig } from './application.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ConfigModule.forFeature(applicationConfig),
    DatabaseModule,
    UserModule,
    RegistrationModule,
    AuthenticationModule,
  ],
})
export class ApplicationModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        cookieParser(
          this.configService.getOrThrow<ApplicationConfig['cookieSecret']>(
            'application.cookieSecret',
          ),
        ),
      )
      .forRoutes('*');
  }
}
