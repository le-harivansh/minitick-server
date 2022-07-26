import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { RegisterUserDto } from './dto/registration.dto';
import { RegistrationService } from './registration.service';

@Controller('register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @UsePipes(ValidationPipe)
  async register(@Body() registerUserDto: RegisterUserDto) {
    await this.registrationService.registerUser(registerUserDto);
  }
}
