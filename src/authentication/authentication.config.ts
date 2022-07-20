import Joi from 'joi';

import registerConfiguration from '../lib/register-configuration';

export interface AuthenticationConfig {
  accessTokenSecret: string;
  accessTokenDuration: string;

  refreshTokenSecret: string;
  refreshTokenDuration: string;
}

export default registerConfiguration<AuthenticationConfig>('authentication', {
  accessTokenSecret: {
    env: 'JWT_ACCESS_TOKEN_SECRET',
    rules: Joi.string().min(32).required(),
  },
  accessTokenDuration: {
    env: 'JWT_ACCESS_TOKEN_DURATION',
    rules: Joi.string().default('15 minutes'),
  },

  refreshTokenSecret: {
    env: 'JWT_REFRESH_TOKEN_SECRET',
    rules: Joi.string().min(32).required(),
  },
  refreshTokenDuration: {
    env: 'JWT_REFRESH_TOKEN_DURATION',
    rules: Joi.string().default('1 week'),
  },
});
