import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { HttpStatus } from '@nestjs/common';

@Catch(MongoServerError)
export class UserExistsFilter implements ExceptionFilter {
  catch(exception: MongoServerError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const messages: string[] = [];

    switch (exception.code) {
      case 11000:
        messages.push(
          `username '${request.body.username}' already exists in the database.`,
        );
        break;

      default:
        messages.push(
          `[${exception.name}::${exception.code}] ${exception.message}`,
        );
        break;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: messages,
      error: 'Bad Request',
    });
  }
}
