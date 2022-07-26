import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import IsUnique from '../../user/validator/is-unique.validator';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @IsUnique()
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
