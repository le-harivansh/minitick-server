import {
  BadRequestException,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

import { RequestUser } from '../schema/user.schema';
import { getUserFromRequest } from './user.decorator';

describe(getUserFromRequest.name, () => {
  const mockExecutionContext = (user?: RequestUser) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext);

  const user: RequestUser = { id: '0000', username: 'zero' };

  it('returns the user object attached to the request object', () => {
    expect(
      getUserFromRequest(undefined, mockExecutionContext(user)),
    ).toStrictEqual(user);
  });

  it("returns the value of the specified property from the user's object", () => {
    expect(getUserFromRequest('id', mockExecutionContext(user))).toBe(user.id);
  });

  it('throws a bad-request http error if the request has no user object', () => {
    expect(() => getUserFromRequest(undefined, mockExecutionContext())).toThrow(
      BadRequestException,
    );
  });

  it('throws a server-error if the queried property does not exist on the user object', () => {
    expect(() =>
      getUserFromRequest('nope' as unknown as 'id', mockExecutionContext(user)),
    ).toThrow(InternalServerErrorException);
  });
});
