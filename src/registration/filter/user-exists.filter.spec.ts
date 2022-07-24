import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { MongoServerError } from 'mongodb';

import { UserExistsFilter } from './user-exists.filter';

describe('UserExistsFilter', () => {
  function generateMongoServerError(message: string, code?: number) {
    const exception = new MongoServerError({ message });

    exception.code = code;

    return exception;
  }

  function generateArgumentsHost(invalidUsername?: string) {
    const response = new (class {
      statusCode: HttpStatus;
      jsonBody: unknown;

      status(code: HttpStatus) {
        this.statusCode = code;

        return this;
      }

      json(body: unknown) {
        this.jsonBody = body;
      }
    })();

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ body: { username: invalidUsername } }),
        getResponse: () => response,
      }),
    };

    return {
      host,
      response,
    };
  }

  it('returns the correct json response when a MongoServerError is caught', () => {
    const exception = generateMongoServerError('', 11000);
    const username = 'INVALID_USERNAME';
    const { host, response } = generateArgumentsHost(username);

    new UserExistsFilter().catch(exception, host as ArgumentsHost);

    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.jsonBody).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: [`username '${username}' already exists in the database.`],
      error: 'Bad Request',
    });
  });

  it('returns an error message if any other error is caught', () => {
    const message = 'An error occured.';
    const exception = generateMongoServerError(message);
    const { host, response } = generateArgumentsHost();

    new UserExistsFilter().catch(exception, host as ArgumentsHost);

    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.jsonBody).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: [message],
      error: 'Bad Request',
    });
  });
});
