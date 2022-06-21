import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegistrationDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
