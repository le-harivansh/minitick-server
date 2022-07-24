import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class HashedRefreshToken {
  @Prop({ required: true })
  hash: string;

  /**
   * This field is ONLY used to check whether a refresh-token needs to be
   * pruned from the database.
   *
   * DO NOT check the validity of the token using this field, since expiry date
   * checks are automatically done by passport-jwt using data in the JWT token.
   */
  @Prop({ type: Date, required: true })
  expiresOn: Date;
}

export const HashedRefreshTokenSchema =
  SchemaFactory.createForClass(HashedRefreshToken);
