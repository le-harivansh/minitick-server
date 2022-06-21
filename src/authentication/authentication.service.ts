import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserService } from '../user/user.service';
import { User } from '../user/user.schema';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'> | undefined> {
    const retrievedUser = await this.userService.findByUsername(username);

    if (
      retrievedUser &&
      (await argon2.verify(retrievedUser.password, password))
    ) {
      const { username } = retrievedUser;

      return {
        username,
      };
    }
  }

  generateAccessToken(userData: Omit<User, 'password'>) {
    return this.jwtService.sign(userData);
  }
}
