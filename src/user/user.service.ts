import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { argon2id, hash } from 'argon2';
import { Model } from 'mongoose';
import ms from 'ms';

import { AuthenticationConfiguration } from '../authentication/authentication.config';
import { HashedRefreshToken } from './schema/hashed-refresh-token.schema';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async createUser({ password, ...userData }: User) {
    return this.userModel.create({
      ...userData,
      password: await hash(password, { type: argon2id }),
    });
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(userId: string) {
    return this.userModel.findById(userId).exec();
  }

  async updateUser(
    userId: string,
    { password, ...userData }: Partial<Omit<User, 'hashedRefreshTokens'>>,
  ) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          ...userData,
          ...(password && {
            password: await hash(password, { type: argon2id }),
          }),
        },
        { new: true },
      )
      .exec();
  }

  async deleteUser(userId: string) {
    return this.userModel.findByIdAndDelete(userId).exec();
  }

  async saveHashedRefreshToken(userId: string, token: string) {
    const nonExpiredHashedRefreshTokens = (
      await this.findById(userId)
    ).hashedRefreshTokens.filter(({ expiresOn }) => expiresOn >= new Date());

    const newHashedRefreshToken: HashedRefreshToken = {
      hash: await hash(token, { type: argon2id }),
      expiresOn: new Date(
        Date.now() +
          ms(
            this.configService.getOrThrow<
              AuthenticationConfiguration['jwt']['refreshToken']['duration']
            >('authentication.jwt.refreshToken.duration'),
          ),
      ),
    };

    await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          hashedRefreshTokens: [
            ...nonExpiredHashedRefreshTokens,
            newHashedRefreshToken,
          ],
        },
      })
      .exec();
  }
}
