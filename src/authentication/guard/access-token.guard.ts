import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ACCESS_TOKEN_GUARD } from '../constants';

@Injectable()
export class RequiresAccessToken extends AuthGuard(ACCESS_TOKEN_GUARD) {}
