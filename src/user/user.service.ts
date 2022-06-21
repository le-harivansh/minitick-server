import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: User) {
    return this.userModel.create(userData);
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }
}
