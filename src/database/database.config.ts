import * as Joi from 'joi';
import registerConfiguration from '../helpers/register-configuration';

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
}

export default registerConfiguration<DatabaseConfig>('database', {
  host: {
    env: 'DATABASE_HOST',
    rules: Joi.string().hostname().required(),
  },
  port: {
    env: 'DATABASE_PORT',
    rules: Joi.number().port().required(),
  },
  name: {
    env: 'DATABASE_NAME',
    rules: Joi.string().required(),
  },
});
