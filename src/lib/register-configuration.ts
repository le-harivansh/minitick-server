import { registerAs } from '@nestjs/config';
import Joi from 'joi';

type Env = string;
type Rules = Joi.SchemaLike | Joi.SchemaLike[];

type EnvRule = { env: Env; rules: Rules };

// The type of the value of the processed environment variables.
type Value = string | number | boolean;

export type ConfigurationMap<T> = T extends Value
  ? EnvRule
  : { [Property in keyof T]: ConfigurationMap<T[Property]> };

type EnvMap<T> = T extends Value
  ? string
  : { [Property in keyof T]: EnvMap<T[Property]> };
type JoiMap<T> = T extends Value
  ? Rules
  : { [Property in keyof T]: JoiMap<T[Property]> };

type ReturnMap<T, U> = U extends 'env'
  ? EnvMap<T>
  : U extends 'rules'
  ? JoiMap<T>
  : never;

type Argument<U> = U extends 'env' ? string : U extends 'rules' ? Rules : never;

/**
 * Similar to @nestjs/config::registerAs, but also validates the environment values passed to it.
 *
 * @param namespace The namespace/key/token under which the configuration will be stored
 * @param configurationMap An object containing the property to add to the configuration, its associated environment variable key, and validation rules.
 *        e.g.: {
 *                host: {
 *                  env: 'APPLICATION_HOST',
 *                  rules: Joi.string().hostname().required()
 *                },
 *                jwt: {
 *                  accessToken: {
 *                    duration: {
 *                      env: 'JWT_ACCESS_TOKEN_DURATION',
 *                      rules: Joi.string().default('15 minutes')
 *                    }
 *                  }
 *                }
 *              }
 * @type T The type of the configuration object that will be returned by the validation.
 */
export default function registerConfiguration<T>(
  namespace: string,
  configurationMap: ConfigurationMap<T>,
) {
  return registerAs(namespace, (): T => {
    const schema = Joi.object<T>(
      filterAndTransformConfigurationForProperty<T, 'rules'>(
        'rules',
        configurationMap,
      ) as Joi.SchemaMap<T>,
    );

    const { value: validatedConfig, error } = schema.validate(
      filterAndTransformConfigurationForProperty<T, 'env'>(
        'env',
        configurationMap,
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

/**
 * Create a new configuration object using the configurationMap; where the new configuration object's values are equal to the property from which they
 * were harvested.
 *
 * e.g.:
 *    filterConfigurationForProperty('env', { one: { env: 'ONE', rules: Joi.number() }, two: { three: { env: 'THREE', rules: Joi.string() } } }) ==> { one: 'ONE', two: { three: 'THREE' } }
 *    filterConfigurationForProperty('rules', { one: { env: 'ONE', rules: Joi.number() }, two: { three: { env: 'THREE', rules: Joi.string() } } }) ==> { one: Joi.number(), two: { three: Joi.string() } }
 *
 * @param propertyToFilter The property to filter for (either 'env' or 'rules').
 * @param configurationMap The configuration object to filter through.
 * @param transformer The transformer to pass the retrieved value (from the property `propertyToFilter`) to.
 *
 * @returns A new configuration object where the 'ultimate' values' of the properties are equal to the values of either 'env' or 'rules' - depending of the propertyToFilter argument.
 */
export function filterAndTransformConfigurationForProperty<
  T,
  U extends keyof EnvRule,
>(
  propertyToFilter: U,
  configurationMap: ConfigurationMap<T>,
  transformer: (value: Argument<U>) => unknown = (value) => value,
): ReturnMap<T, U> {
  return Object.keys(configurationMap)
    .map((property) => {
      const isEnvRulesObject = isSimilar(
        Object.keys(configurationMap[property]),
        ['env', 'rules'],
      );

      if (isEnvRulesObject) {
        return {
          [property]: transformer(configurationMap[property][propertyToFilter]),
        };
      } else {
        return {
          [property]: filterAndTransformConfigurationForProperty<T[keyof T], U>(
            propertyToFilter,
            configurationMap[property],
            transformer,
          ),
        };
      }
    })
    .reduce((previous, next) => ({ ...previous, ...next })) as ReturnMap<T, U>;
}

/**
 * Checks whether two arrays have the same items
 */
export function isSimilar(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}
