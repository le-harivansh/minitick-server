import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { RequiresAccessToken } from '../authentication/guard/access-token.guard';
import { User } from '../user/decorator/user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RequiresOwnership } from './guard/task.guard';
import { TaskService } from './task.service';

@Controller()
@UseGuards(RequiresAccessToken)
@UsePipes(ValidationPipe)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('task')
  async create(@User('id') userId: string, @Body() { title }: CreateTaskDto) {
    return this.taskService.create(userId, title);
  }

  @Get('tasks')
  async findAll(@User('id') userId: string) {
    return this.taskService.findAll(userId);
  }

  @Patch('task/:id')
  @UseGuards(RequiresOwnership)
  async update(
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(taskId, updateTaskDto);
  }

  @Delete('task/:id')
  @UseGuards(RequiresOwnership)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') taskId: string) {
    this.taskService.remove(taskId);
  }
}
