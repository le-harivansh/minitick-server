import { Injectable } from '@nestjs/common';
import { argon2id, hash } from 'argon2';

import { UserService } from '../user/user.service';
import { RegistrationDto } from './dto/registration.dto';

@Injectable()
export class RegistrationService {
  constructor(private readonly userService: UserService) {}

  async registerUser({ password, ...registrationData }: RegistrationDto) {
    return this.userService.create({
      ...registrationData,
      password: await hash(password, { type: argon2id }),
    });
  }
}
