import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RequiresAccessToken extends AuthGuard('access-token') {}
