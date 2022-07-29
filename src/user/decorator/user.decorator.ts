import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';

import { RequestUser } from '../schema/user.schema';

export function getUserFromRequest(
  property: keyof RequestUser,
  context: ExecutionContext,
) {
  const user = context.switchToHttp().getRequest().user as RequestUser;

  if (!user) {
    throw new InternalServerErrorException('Cannot retrieve user.');
  }

  if (property && !Object.hasOwn(user, property)) {
    throw new InternalServerErrorException(
      `Property '${property}' does not exist on the user object.`,
    );
  }

  return !!property ? user[property] : user;
}

export const User = createParamDecorator(getUserFromRequest);
