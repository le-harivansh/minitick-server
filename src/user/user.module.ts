import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { IsUniqueValidatorConstraint } from './validator/is-unique.validator';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserService, IsUniqueValidatorConstraint],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
