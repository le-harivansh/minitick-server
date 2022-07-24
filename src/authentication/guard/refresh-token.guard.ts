import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { REFRESH_TOKEN_GUARD } from '../constants';

@Injectable()
export class RequiresRefreshToken extends AuthGuard(REFRESH_TOKEN_GUARD) {}
