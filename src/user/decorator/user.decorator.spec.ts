import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';

import { RequestUser } from '../schema/user.schema';
import { getUserFromRequest } from './user.decorator';

describe(getUserFromRequest.name, () => {
  const mockExecutionContext = (user?: RequestUser) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext);

  describe('when called', () => {
    const user: RequestUser = { id: '0000', username: 'zero' };

    test('it returns the user object attached to the request object', () => {
      expect(
        getUserFromRequest(undefined, mockExecutionContext(user)),
      ).toMatchObject(user);
    });

    test("it returns the value of the specified property from the user's object", () => {
      expect(getUserFromRequest('id', mockExecutionContext(user))).toBe(
        user.id,
      );
    });

    test('it throws a server-error if the request has no user object', () => {
      expect(() =>
        getUserFromRequest(undefined, mockExecutionContext()),
      ).toThrow(InternalServerErrorException);
    });

    test('it throws a server-error if the queried property does not exist on the user object', () => {
      expect(() =>
        getUserFromRequest(
          'nope' as unknown as 'id',
          mockExecutionContext(user),
        ),
      ).toThrow(InternalServerErrorException);
    });
  });
});
