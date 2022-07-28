import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

import IsUnique from '../validator/is-unique.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @IsUnique()
  readonly username?: string;

  @IsOptional()
  @MinLength(8)
  readonly password?: string;

  /**
   * This property should not be processed in the DTO.
   * Its only purpose is to throw an error if ALL of the above properties are
   * empty.
   */
  @ValidateIf(
    ({ username, password }: UpdateUserDto) => !(username || password),
  )
  @IsNotEmpty({
    message: 'The provided payload should not be empty',
  })
  readonly _?: boolean;
}
