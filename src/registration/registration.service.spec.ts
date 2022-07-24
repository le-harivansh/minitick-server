import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';

import { UserService } from '../user/user.service';
import { RegistrationDto } from './dto/registration.dto';
import { RegistrationService } from './registration.service';

describe('RegistrationService (unit)', () => {
  let registrationService: RegistrationService;
  const userService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
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

  it("hashes the password before passing the user's data to the UserService", async () => {
    const registrationDto: RegistrationDto = {
      username: 'Hello-World',
      password: 'le_p@Ssw0rd',
    };

    await registrationService.registerUser(registrationDto);

    expect(userService.create).toHaveBeenCalledTimes(1);
    expect(
      await verify(
        userService.create.mock.calls[0][0].password,
        registrationDto.password,
      ),
    ).toBeTruthy();
  });
});
