import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LOCAL_GUARD } from '../constants';

@Injectable()
export class RequiresCredentials extends AuthGuard(LOCAL_GUARD) {}
