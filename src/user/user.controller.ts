import {
  Body,
  Controller,
  Delete,
  Patch,
  Response,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { ACCESS_TOKEN, REFRESH_TOKEN } from '../authentication/constants';
import { RequiresAccessToken } from '../authentication/guard/access-token.guard';
import { User } from './decorator/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch()
  @UseGuards(RequiresAccessToken)
  @UsePipes(ValidationPipe)
  async update(
    @User('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.userService.updateUser(userId, updateUserDto);
  }

  @Delete()
  @UseGuards(RequiresAccessToken)
  async delete(
    @User('id') userId: string,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.userService.deleteUser(userId);

    response.clearCookie(ACCESS_TOKEN, {
      secure: true,
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
    });

    response.clearCookie(REFRESH_TOKEN, {
      secure: true,
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
    });
  }
}
