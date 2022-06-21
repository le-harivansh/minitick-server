import {
  Body,
  Controller,
  Post,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RegistrationDto } from './dto/registration.dto';
import { RegistrationService } from './registration.service';
import { UserExistsFilter } from './filters/user-exists.filter';

@Controller('register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @UsePipes(ValidationPipe)
  @UseFilters(UserExistsFilter)
  async register(@Body() registrationDto: RegistrationDto) {
    await this.registrationService.registerUser(registrationDto);
  }
}
