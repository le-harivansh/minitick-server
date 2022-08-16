import { IsNotEmpty } from 'class-validator';

export class RefreshPasswordConfirmationTokenDto {
  @IsNotEmpty()
  readonly password: string;
}
