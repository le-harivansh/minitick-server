import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/registration.dto';

@Controller('register')
export class RegistrationController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UsePipes(ValidationPipe)
  async register(@Body() registerUserDto: RegisterUserDto) {
    await this.userService.createUser(registerUserDto);
  }
}
