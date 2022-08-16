import Joi from 'joi';

import { msDurationPattern } from '../lib/helpers';
import registerConfiguration from '../lib/register-configuration';

export type AuthenticationConfiguration = {
  jwt: {
    accessToken: {
      duration: string;
      secret: string;
    };
    refreshToken: {
      duration: string;
      secret: string;
    };
    passwordConfirmationToken: {
      duration: string;
      secret: string;
    };
  };
};

export default registerConfiguration<AuthenticationConfiguration>(
  'authentication',
  {
    jwt: {
      accessToken: {
        duration: {
          env: 'JWT_ACCESS_TOKEN_DURATION',
          rules: Joi.string().pattern(msDurationPattern).default('15 minutes'),
        },
        secret: {
          env: 'JWT_ACCESS_TOKEN_SECRET',
          rules: Joi.string().min(32).required(),
        },
      },
      refreshToken: {
        duration: {
          env: 'JWT_REFRESH_TOKEN_DURATION',
          rules: Joi.string().pattern(msDurationPattern).default('1 week'),
        },
        secret: {
          env: 'JWT_REFRESH_TOKEN_SECRET',
          rules: Joi.string().min(32).required(),
        },
      },
      passwordConfirmationToken: {
        duration: {
          env: 'JWT_PASSWORD_CONFIRMATION_TOKEN_DURATION',
          rules: Joi.string().pattern(msDurationPattern).default('5 minutes'),
        },
        secret: {
          env: 'JWT_PASSWORD_CONFIRMATION_TOKEN_SECRET',
          rules: Joi.string().min(32).required(),
        },
      },
    },
  },
);
