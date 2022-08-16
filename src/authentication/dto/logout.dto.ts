import { IsIn, IsOptional } from 'class-validator';

export enum LogoutScope {
  CURRENT_SESSION = 'current-session',
  OTHER_SESSIONS = 'other-sessions',
}

export class LogoutDto {
  @IsOptional()
  @IsIn([LogoutScope.CURRENT_SESSION, LogoutScope.OTHER_SESSIONS])
  readonly scope: LogoutScope;
}
