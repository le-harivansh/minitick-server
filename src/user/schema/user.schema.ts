import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { RefreshToken, RefreshTokenSchema } from './refresh-token.schema';

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: [RefreshTokenSchema],
  })
  refreshTokens?: RefreshToken[];
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

export type UserData = Pick<User, 'username'>;
