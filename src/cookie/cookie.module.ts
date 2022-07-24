import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

import cookieConfiguration, { CookieConfiguration } from './cookie.config';

@Module({
  imports: [ConfigModule.forFeature(cookieConfiguration)],
})
export class CookieModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        cookieParser(
          this.configService.getOrThrow<CookieConfiguration['secret']>(
            'cookie.secret',
          ),
        ),
      )
      .forRoutes('*');
  }
}
