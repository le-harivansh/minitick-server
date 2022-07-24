import Joi from 'joi';

import registerConfiguration from './lib/register-configuration';

export type ApplicationConfiguration = {
  port: number;
  cors: {
    origin: string;
  };
};

export default registerConfiguration<ApplicationConfiguration>('application', {
  port: {
    env: 'APPLICATION_PORT',
    rules: Joi.number().port().default(80),
  },
  cors: {
    origin: {
      env: 'CORS_ORIGIN',
      rules: Joi.string().uri().required(),
    },
  },
});
