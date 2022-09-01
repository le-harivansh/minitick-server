import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { User } from '../../user/schema/user.schema';

@Schema()
export class Task {
  @Prop({ type: Types.ObjectId, ref: () => User })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: false })
  isComplete?: boolean;
}

export type TaskDocument = Task & Document;

export const TaskSchema = SchemaFactory.createForClass(Task);
