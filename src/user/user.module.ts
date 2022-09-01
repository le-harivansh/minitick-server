import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { TaskModule } from '../task/task.module';
import { User, UserSchema } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsernameIsUniqueValidatorConstraint } from './validator/username-is-unique.validator';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TaskModule,
  ],
  providers: [UserService, UsernameIsUniqueValidatorConstraint],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
