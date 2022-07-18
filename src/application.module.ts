import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { RegistrationModule } from './registration/registration.module';
import applicationConfig from './application.config';

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
export class ApplicationModule {}
