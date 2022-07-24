import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';

@Catch(MongoServerError)
export class UserExistsFilter implements ExceptionFilter {
  catch(exception: MongoServerError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    let status: HttpStatus;
    const messages: string[] = [];

    switch (exception.code) {
      case 11000:
        status = HttpStatus.BAD_REQUEST;
        messages.push(
          `username '${request.body.username}' already exists in the database.`,
        );
        break;

      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        messages.push(exception.message);
        break;
    }

    response.status(status).json({
      statusCode: status,
      message: messages,
      error: 'Bad Request',
    });
  }
}
