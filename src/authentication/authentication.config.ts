import Joi from 'joi';

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
  };
};

/**
 * The string pattern used by 'ms' to define durations.
 */
const msDurationPattern =
  /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i;

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
    },
  },
);
