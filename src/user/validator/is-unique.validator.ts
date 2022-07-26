import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

import { UserService } from '../user.service';

@Injectable()
@ValidatorConstraint({ async: true })
export class IsUniqueValidator implements ValidatorConstraintInterface {
  constructor(private readonly userService: UserService) {}

  async validate(username: string): Promise<boolean> {
    return !(await this.userService.findByUsername(username));
  }

  defaultMessage?(validationArguments?: ValidationArguments): string {
    return `username '${validationArguments.value}' already exists.`;
  }
}

export default function IsUnique(validationOptions?: ValidationOptions) {
  return (object: unknown, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      async: true,
      options: validationOptions,
      validator: IsUniqueValidator,
    });
}
