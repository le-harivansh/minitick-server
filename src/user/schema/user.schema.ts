import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  HashedRefreshToken,
  HashedRefreshTokenSchema,
} from './hashed-refresh-token.schema';

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: [HashedRefreshTokenSchema],
  })
  hashedRefreshTokens?: HashedRefreshToken[];
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

export type UserData = Omit<User, 'password' | 'hashedRefreshTokens'>;
