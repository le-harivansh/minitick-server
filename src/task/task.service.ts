import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Task, TaskDocument } from './schema/task.schema';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(userId: string, title: string) {
    return this.taskModel.create({ userId, title });
  }

  async findOne(taskId: string) {
    return this.taskModel.findById(taskId).exec();
  }

  async findAllForUser(userId: string) {
    return this.taskModel.find({ userId }).exec();
  }

  async update(taskId: string, updateData: Partial<Omit<Task, 'userId'>>) {
    return this.taskModel.findByIdAndUpdate(taskId, updateData, { new: true });
  }

  async remove(taskId: string) {
    await this.taskModel.findByIdAndDelete(taskId).exec();
  }

  async removeForUser(userId: string) {
    await this.taskModel.deleteMany({ userId }).exec();
  }
}
