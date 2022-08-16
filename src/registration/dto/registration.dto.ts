import { IsString, MinLength } from 'class-validator';

import IsUnique from '../../user/validator/is-unique.validator';

export class RegisterUserDto {
  @IsString()
  @MinLength(4)
  @IsUnique()
  readonly username: string;

  @MinLength(8)
  readonly password: string;
}
