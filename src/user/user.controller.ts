import {
  Body,
  Controller,
  Patch,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { RequiresAccessToken } from '../authentication/guard/access-token.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserData } from './schema/user.schema';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch()
  @UseGuards(RequiresAccessToken)
  @UsePipes(ValidationPipe)
  async update(
    @Request() request: ExpressRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.userService.updateUser(
      (request.user as UserData).username,
      updateUserDto,
    );

    // @todo: If the username is changed, i will need to regenerate access & refresh tokens
    //        because users are identified by their usernames in access-tokens.
  }
}
