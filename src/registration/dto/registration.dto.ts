import { IsString, MinLength } from 'class-validator';

import IsUnique from '../../user/validator/is-unique.validator';

export class RegisterUserDto {
  @IsString({ message: 'The username should be a string.' })
  @MinLength(4, {
    message: ({ constraints }) =>
      `The username should be at least ${constraints} characters long.`,
  })
  @IsUnique()
  readonly username: string;

  @MinLength(8, {
    message: ({ constraints }) =>
      `The password should be at least ${constraints} characters long.`,
  })
  readonly password: string;
}
