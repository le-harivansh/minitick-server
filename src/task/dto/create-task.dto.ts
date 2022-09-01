import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'The title should be a string.' })
  @IsNotEmpty({ message: 'The provided title should not be empty.' })
  readonly title: string;
}
