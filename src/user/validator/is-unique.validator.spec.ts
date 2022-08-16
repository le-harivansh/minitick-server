import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../user.service';
import { IsUniqueValidatorConstraint } from './is-unique.validator';

describe(IsUniqueValidatorConstraint.name, () => {
  let validator: IsUniqueValidatorConstraint;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: {
            async findByUsername(username: string) {
              return {
                'existing-username': { username },
              }[username];
            },
          },
        },
        IsUniqueValidatorConstraint,
      ],
    }).compile();

    validator = module.get(IsUniqueValidatorConstraint);
  });

  describe('validate', () => {
    it('returns false if a user exists', () => {
      expect(validator.validate('existing-username')).resolves.toBe(false);
    });

    it('returns true if a user does not exist', () => {
      expect(validator.validate('nonexisting-username')).resolves.toBe(true);
    });
  });
});
