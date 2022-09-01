import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'The title should be a string.' })
  readonly title?: string;

  @IsOptional()
  readonly isComplete?: boolean;

  /**
   * This property should not be processed in the DTO.
   * Its only purpose is to throw an error if ALL of the above properties are
   * empty.
   */
  @ValidateIf(({ title, isComplete }: UpdateTaskDto) => !(title || isComplete))
  @IsNotEmpty({
    message: "Provide either the task's title or status to be updated.",
  })
  readonly _?: boolean;
}
