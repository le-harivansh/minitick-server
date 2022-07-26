import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';

import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/registration.dto';
import { RegistrationService } from './registration.service';

describe(RegistrationService.name, () => {
  let registrationService: RegistrationService;
  const userService = { createUser: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
        RegistrationService,
      ],
    }).compile();

    registrationService = module.get(RegistrationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    describe('when called', () => {
      test("it hashes the password before passing the user's data to the resolved `UserService`", async () => {
        const registrationDto: RegisterUserDto = {
          username: 'Hello-World',
          password: 'le_p@Ssw0rd',
        };

        await registrationService.registerUser(registrationDto);

        expect(userService.createUser).toHaveBeenCalledTimes(1);

        expect(
          verify(
            userService.createUser.mock.calls[0][0].password,
            registrationDto.password,
          ),
        ).resolves.toBeTruthy();
      });
    });
  });
});
