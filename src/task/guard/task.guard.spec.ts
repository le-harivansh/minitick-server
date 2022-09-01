import { ExecutionContext } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { RequiresOwnership } from '../guard/task.guard';
import { TaskService } from '../task.service';

describe(RequiresOwnership.name, () => {
  const generateExecutionContext = (
    authenticatedUserId: string,
    taskIdRouteParam: string,
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: taskIdRouteParam },
          user: { id: authenticatedUserId },
        }),
      }),
    } as unknown as ExecutionContext);

  const generateTaskService = (
    taskToReturn: { userId: string } | null = null,
  ) => ({ findOne: () => taskToReturn } as unknown as TaskService);

  it('returns false if the task does not exist', async () => {
    const authenticatedUserId = new ObjectId().toString();
    const taskIdRouteParam = new ObjectId().toString();

    const taskOwnershipGuard = new RequiresOwnership(generateTaskService());

    expect(
      taskOwnershipGuard.canActivate(
        generateExecutionContext(authenticatedUserId, taskIdRouteParam),
      ),
    ).resolves.toBe(false);
  });

  it('returns false if the currently authenticated user is not the owner of the task', async () => {
    const authenticatedUserId = new ObjectId().toString();
    const taskIdRouteParam = new ObjectId().toString();

    const taskOwnershipGuard = new RequiresOwnership(
      generateTaskService({ userId: new ObjectId().toString() }),
    );

    expect(
      taskOwnershipGuard.canActivate(
        generateExecutionContext(authenticatedUserId, taskIdRouteParam),
      ),
    ).resolves.toBe(false);
  });

  it('returns true if the authenticated user is the owner of the task', async () => {
    const authenticatedUserId = new ObjectId().toString();
    const taskIdRouteParam = new ObjectId().toString();

    const taskOwnershipGuard = new RequiresOwnership(
      generateTaskService({ userId: authenticatedUserId }),
    );

    expect(
      taskOwnershipGuard.canActivate(
        generateExecutionContext(authenticatedUserId, taskIdRouteParam),
      ),
    ).resolves.toBe(true);
  });
});
