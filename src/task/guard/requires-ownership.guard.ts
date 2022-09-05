import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { RequestUser } from '../../user/schema/user.schema';
import { TaskService } from '../task.service';

@Injectable()
export class RequiresOwnership implements CanActivate {
  constructor(private readonly taskService: TaskService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: ExpressRequest = context.switchToHttp().getRequest();
    const task = await this.taskService.findOne(request.params['id']);
    const currentlyAuthenticatedUser = request.user as RequestUser;

    if (task && task.userId == currentlyAuthenticatedUser.id) {
      return true;
    }

    return false;
  }
}
