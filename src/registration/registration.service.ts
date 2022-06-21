import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserService } from '../user/user.service';
import { RegistrationDto } from './dto/registration.dto';

@Injectable()
export class RegistrationService {
  constructor(private readonly userService: UserService) {}

  async registerUser(registrationDto: RegistrationDto) {
    return this.userService.create({
      ...registrationDto,
      password: await argon2.hash(registrationDto.password, {
        type: argon2.argon2id,
      }),
    });
  }
}
