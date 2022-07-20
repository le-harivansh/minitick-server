import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { argon2id, hash } from 'argon2';
import { Model } from 'mongoose';
import ms from 'ms';

import { AuthenticationConfig } from '../authentication/authentication.config';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(userData: User) {
    return this.userModel.create(userData);
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }

  async saveRefreshToken(username: string, token: string) {
    const user = await this.findByUsername(username);

    // @todo: prune stale tokens

    user.refreshTokens.push({
      hash: await hash(token, { type: argon2id }),
      expiresOn: new Date(
        Date.now() +
          ms(
            this.configService.getOrThrow<
              AuthenticationConfig['refreshTokenDuration']
            >('authentication.refreshTokenDuration'),
          ),
      ),
    });

    await user.save();
  }
}
