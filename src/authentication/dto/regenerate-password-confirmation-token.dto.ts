import { IsNotEmpty } from 'class-validator';

export class RegeneratePasswordConfirmationTokenDto {
  @IsNotEmpty()
  readonly password: string;
}
