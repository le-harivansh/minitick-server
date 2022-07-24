import Joi from 'joi';

import {
  ConfigurationMap,
  filterAndTransformConfigurationForProperty,
  isSimilar,
} from './register-configuration';

describe('isSimilar', () => {
  it('returns true if two provided arrays are similar', () => {
    expect(isSimilar(['a', 'b', 'c', 'd'], ['c', 'b', 'd', 'a'])).toBeTruthy();
  });

  it('returns false if two provided arrays do not have the same length', () => {
    expect(isSimilar([1, 5, 3, 7, 5], [1, 5, 3, 7])).toBeFalsy();
  });

  it('returns false if two provided arrays do not have the same items', () => {
    expect(isSimilar(['a', 44, 'b', 55], ['z', 44, 'f', 66])).toBeFalsy();
  });
});

describe('filterConfigurationForProperty', () => {
  describe('shallow', () => {
    type Configuration = {
      one: string;
      two: number;
      three: boolean;
    };

    const configuration: ConfigurationMap<Configuration> = {
      one: {
        env: 'ONE',
        rules: Joi.string(),
      },
      two: {
        env: 'TWO',
        rules: Joi.number(),
      },
      three: {
        env: 'THREE',
        rules: Joi.boolean(),
      },
    };

    it("correctly creates a new configuration object with the 'env' key as the value", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'env'>(
          'env',
          configuration,
        ),
      ).toMatchObject({
        one: 'ONE',
        two: 'TWO',
        three: 'THREE',
      });
    });

    it("correctly creates a new configuration object with the 'rules' key as the value", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'rules'>(
          'rules',
          configuration,
        ),
      ).toMatchObject({
        one: Joi.string(),
        two: Joi.number(),
        three: Joi.boolean(),
      });
    });

    it("transforms the 'ultimate' values according to the transformer passed", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'env'>(
          'env',
          configuration,
          (value) => `ITEM-${value}`,
        ),
      ).toMatchObject({
        one: 'ITEM-ONE',
        two: 'ITEM-TWO',
        three: 'ITEM-THREE',
      });
    });
  });

  describe('deep', () => {
    type Configuration = {
      item_1: {
        property_1: string;
        property_2: boolean;
      };
      item_2: {
        property_1: number;
      };
      item_3: {
        property_0: {
          sub_property: string;
        };
      };
      item_4: boolean;
    };

    const configuration: ConfigurationMap<Configuration> = {
      item_1: {
        property_1: {
          env: 'ITEM_1_PROPERTY_1',
          rules: Joi.string(),
        },
        property_2: {
          env: 'ITEM_1_PROPERTY_2',
          rules: Joi.boolean(),
        },
      },
      item_2: {
        property_1: {
          env: 'ITEM_2_PROPERTY_1',
          rules: Joi.number(),
        },
      },
      item_3: {
        property_0: {
          sub_property: {
            env: 'ITEM_3_PROPERTY_0_SUB_PROPERTY',
            rules: Joi.string(),
          },
        },
      },
      item_4: {
        env: 'ITEM_4',
        rules: Joi.boolean(),
      },
    };

    it("correctly creates a new configuration object with the 'env' key as the value", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'env'>(
          'env',
          configuration,
        ),
      ).toMatchObject({
        item_1: {
          property_1: 'ITEM_1_PROPERTY_1',
          property_2: 'ITEM_1_PROPERTY_2',
        },
        item_2: {
          property_1: 'ITEM_2_PROPERTY_1',
        },
        item_3: {
          property_0: {
            sub_property: 'ITEM_3_PROPERTY_0_SUB_PROPERTY',
          },
        },
        item_4: 'ITEM_4',
      });
    });

    it("correctly creates a new configuration object with the 'rules' key as the value", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'rules'>(
          'rules',
          configuration,
        ),
      ).toMatchObject({
        item_1: {
          property_1: Joi.string(),
          property_2: Joi.boolean(),
        },
        item_2: {
          property_1: Joi.number(),
        },
        item_3: {
          property_0: {
            sub_property: Joi.string(),
          },
        },
        item_4: Joi.boolean(),
      });
    });

    it("transforms the 'ultimate' values according to the transformer passed", () => {
      expect(
        filterAndTransformConfigurationForProperty<Configuration, 'env'>(
          'env',
          configuration,
          (value) => `VALUE: ${value}`,
        ),
      ).toMatchObject({
        item_1: {
          property_1: 'VALUE: ITEM_1_PROPERTY_1',
          property_2: 'VALUE: ITEM_1_PROPERTY_2',
        },
        item_2: {
          property_1: 'VALUE: ITEM_2_PROPERTY_1',
        },
        item_3: {
          property_0: {
            sub_property: 'VALUE: ITEM_3_PROPERTY_0_SUB_PROPERTY',
          },
        },
        item_4: 'VALUE: ITEM_4',
      });
    });
  });
});
