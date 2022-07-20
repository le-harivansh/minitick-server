import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';

import { UserService } from '../user/user.service';
import { RegistrationDto } from './dto/registration.dto';
import { RegistrationService } from './registration.service';

describe('RegistrationService', () => {
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

    registrationService = module.get<RegistrationService>(RegistrationService);
  });

  it('hashes the password when registering a user', async () => {
    const registrationDto: RegistrationDto = {
      username: 'Hello-World',
      password: 'le_p@Ssw0rd',
    };

    await registrationService.registerUser(registrationDto);

    expect(userService.create).toHaveBeenCalled();
    expect(
      await verify(
        userService.create.mock.calls[0][0].password,
        registrationDto.password,
      ),
    ).toBeTruthy();
  });
});
