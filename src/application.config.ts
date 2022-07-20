import Joi from 'joi';

import registerConfiguration from './lib/register-configuration';

export interface ApplicationConfig {
  port: number;
  corsOrigin: string;
  cookieSecret: string;
}

export default registerConfiguration<ApplicationConfig>('application', {
  port: {
    env: 'APPLICATION_PORT',
    rules: Joi.number().port().default(80),
  },
  corsOrigin: {
    env: 'CORS_ORIGIN',
    rules: Joi.string().uri().required(),
  },
  cookieSecret: {
    env: 'COOKIE_SECRET',
    rules: Joi.string().min(32).required(),
  },
});
