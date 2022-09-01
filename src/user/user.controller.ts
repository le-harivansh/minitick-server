import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Response,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { RequiresAccessToken } from '../authentication/guard/access-token.guard';
import { RequiresPasswordConfirmationToken } from '../authentication/guard/password-confirmation.guard';
import { TokenRefreshService } from '../authentication/service/token-refresh.service';
import { TaskService } from '../task/task.service';
import { User } from './decorator/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestUser } from './schema/user.schema';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @UseGuards(RequiresAccessToken)
  get(@User() user: RequestUser) {
    return user;
  }

  @Patch()
  @UseGuards(RequiresAccessToken, RequiresPasswordConfirmationToken)
  @UsePipes(ValidationPipe)
  async update(
    @User('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<RequestUser> {
    const updatedUser = await this.userService.updateUser(
      userId,
      updateUserDto,
    );

    return {
      id: updatedUser._id,
      username: updatedUser.username,
    };
  }

  @Delete()
  @UseGuards(RequiresAccessToken, RequiresPasswordConfirmationToken)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @User('id') userId: string,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.userService.deleteUser(userId);
    await this.taskService.removeForUser(userId);

    TokenRefreshService.clearAccessTokenCookieFromResponse(response);
    TokenRefreshService.clearRefreshTokenCookieFromResponse(response);
    TokenRefreshService.clearPasswordConfirmationTokenCookieFromResponse(
      response,
    );
  }
}
