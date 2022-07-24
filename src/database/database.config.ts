import Joi from 'joi';

import registerConfiguration from '../lib/register-configuration';

export type DatabaseConfiguration = {
  host: string;
  port: number;
  name: string;
};

export default registerConfiguration<DatabaseConfiguration>('database', {
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
