import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import applicationConfiguration from './application.config';
import { AuthenticationModule } from './authentication/authentication.module';
import { CookieModule } from './cookie/cookie.module';
import { DatabaseModule } from './database/database.module';
import { RegistrationModule } from './registration/registration.module';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ConfigModule.forFeature(applicationConfiguration),
    CookieModule,
    DatabaseModule,
    UserModule,
    RegistrationModule,
    AuthenticationModule,
    TaskModule,
  ],
})
export class ApplicationModule {}
