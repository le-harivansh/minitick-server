import { Test, TestingModule } from '@nestjs/testing';

import { RegisterUserDto } from './dto/registration.dto';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

describe(RegistrationController.name, () => {
  let registrationController: RegistrationController;
  const registrationService = { registerUser: jest.fn() } as Pick<
    RegistrationService,
    'registerUser'
  >;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RegistrationService,
          useValue: registrationService,
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

        expect(registrationService.registerUser).toHaveBeenCalledTimes(1);

        expect(registrationService.registerUser).toHaveBeenCalledWith(
          registerUserDto,
        );
      });
    });
  });
});
