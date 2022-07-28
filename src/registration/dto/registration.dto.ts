import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import IsUnique from '../../user/validator/is-unique.validator';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @IsUnique()
  readonly username: string;

  @IsNotEmpty()
  @MinLength(8)
  readonly password: string;
}
