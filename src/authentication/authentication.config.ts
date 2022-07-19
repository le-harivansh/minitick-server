import * as Joi from 'joi';
import registerConfiguration from '../lib/register-configuration';

export interface AuthenticationConfig {
  jwtSecret: string;
  accessTokenDuration: string;
}

export default registerConfiguration<AuthenticationConfig>('authentication', {
  jwtSecret: {
    env: 'JWT_SECRET',
    rules: Joi.string().min(32).required(),
  },
  accessTokenDuration: {
    env: 'JWT_ACCESS_TOKEN_DURATION',
    rules: Joi.string().default('15 minutes'),
  },
});
