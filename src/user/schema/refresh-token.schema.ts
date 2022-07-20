import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class RefreshToken {
  @Prop({ required: true })
  hash: string;

  @Prop({ type: Date, required: true })
  expiresOn: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
