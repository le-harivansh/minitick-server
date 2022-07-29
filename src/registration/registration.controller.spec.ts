import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/registration.dto';
import { RegistrationController } from './registration.controller';

describe(RegistrationController.name, () => {
  let registrationController: RegistrationController;
  const userService = { createUser: jest.fn() } as Pick<
    UserService,
    'createUser'
  >;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
      controllers: [RegistrationController],
    }).compile();

    registrationController = module.get(RegistrationController);
  });

  describe('register', () => {
    describe('when called', () => {
      test('it calls `RegistrationService::registerUser` with the passed `registerUserDto`', async () => {
        const registerUserDto: RegisterUserDto = {
          username: 'le-username',
          password: 'the-password',
        };

        await registrationController.register(registerUserDto);

        expect(userService.createUser).toHaveBeenCalledTimes(1);

        expect(userService.createUser).toHaveBeenCalledWith(registerUserDto);
      });
    });
  });
});
