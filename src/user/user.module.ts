import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './schema/user.schema';
import { UserService } from './user.service';
import { IsUniqueValidator } from './validator/is-unique.validator';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserService, IsUniqueValidator],
  exports: [UserService],
})
export class UserModule {}
