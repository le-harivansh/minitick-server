import Joi from 'joi';

import registerConfiguration from '../lib/register-configuration';

export type CookieConfiguration = {
  secret: string;
};

export default registerConfiguration<CookieConfiguration>('cookie', {
  secret: {
    env: 'COOKIE_SECRET',
    rules: Joi.string().min(32).required(),
  },
});
