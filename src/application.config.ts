import * as Joi from 'joi';
import registerConfiguration from './helpers/register-configuration';

export interface ApplicationConfig {
  port: number;
  corsOrigin: string;
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
});
