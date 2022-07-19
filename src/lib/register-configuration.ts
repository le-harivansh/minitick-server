import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Similar to @nestjs/config::registerAs, but also validates the environment values.
 *
 * @param namespace The namespace/key/token under which the configuration will be stored
 * @param configurationMap An object containing the property to add to the configuration, its associated environment variable key, and validation rules.
 *        e.g.: {
 *                host: {
 *                  env: 'APPLICATION_HOST',
 *                  rules: Joi.string().hostname().required()
 *                }
 *              }
 * @type ConfigObjectType The type of the configuration object that will be returned by the validation.
 */
export default function registerConfiguration<ConfigObjectType>(
  namespace: string,
  configurationMap: {
    [key in keyof ConfigObjectType]: {
      env: string;
      rules: Joi.SchemaLike | Joi.SchemaLike[];
    };
  },
) {
  const filter = (
    property: 'env' | 'rules',
    transformer = (value: unknown) => value,
  ) =>
    Object.keys(configurationMap)
      .map((key) => ({
        [key]: transformer(configurationMap[key][property]),
      }))
      .reduce((previous, next) => ({ ...previous, ...next }));

  return registerAs(namespace, () => {
    const schema = Joi.object<ConfigObjectType>(
      filter('rules') as Joi.SchemaMap<ConfigObjectType>,
    );

    const { value: validatedConfig, error } = schema.validate(
      filter(
        'env',
        (environmentVariable: string) => process.env[environmentVariable],
      ),
    );

    if (error) {
      throw new Joi.ValidationError(
        `In ${namespace} configuration - ${error.message}`,
        error.details,
        error._original,
      );
    }

    return validatedConfig;
  });
}
