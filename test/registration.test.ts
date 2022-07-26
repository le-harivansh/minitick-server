import { HttpStatus, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { Model } from 'mongoose';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import { RegisterUserDto } from '../src/registration/dto/registration.dto';
import { User, UserDocument } from '../src/user/schema/user.schema';

describe('User Registration', () => {
  let application: INestApplication;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    userModel = application.get<Model<UserDocument>>(getModelToken(User.name));

    useContainer(application.select(ApplicationModule), {
      fallbackOnErrors: true,
    });

    await application.init();
  });

  afterAll(async () => {
    await application.close();
  });

  describe('/POST regiser', () => {
    describe('for a successful user registration', () => {
      const registrationDto: RegisterUserDto = {
        username: 'registration-username-001',
        password: 'registration-password-001',
      };

      afterEach(async () => {
        await userModel
          .findOneAndDelete({ username: registrationDto.username })
          .exec();
      });

      test("it returns the 'created' HTTP status-code", () => {
        return request(application.getHttpServer())
          .post('/register')
          .send(registrationDto)
          .expect(HttpStatus.CREATED);
      });

      test('it saves a new user to the database', async () => {
        await request(application.getHttpServer())
          .post('/register')
          .send(registrationDto)
          .expect(HttpStatus.CREATED);

        expect(
          userModel.findOne({ username: registrationDto.username }).exec(),
        ).resolves.toMatchObject({ username: registrationDto.username });
      });
    });

    describe('for an unsuccessful user registration', () => {
      const userData: RegisterUserDto = {
        username: 'registration-username-002',
        password: 'registration-password-002',
      };

      beforeAll(async () => {
        await request(application.getHttpServer())
          .post('/register')
          .send(userData)
          .expect(HttpStatus.CREATED);
      });

      afterAll(async () => {
        await userModel
          .findOneAndDelete({ username: userData.username })
          .exec();
      });

      test.each([
        // IsNotEmpty
        { username: '', password: '' },
        { username: 'registration-username-003', password: '' },
        { username: '', password: 'registration-password-003' },

        // IsString
        { username: 44, password: 55 },
        { username: 'registration-username-004', password: 55 },
        { username: 44, password: 'registration-password-004' },

        // username: MinLength(4)
        { username: 'ru5', password: 'registration-password-005' },

        // password: MinLength(8)
        { username: 'registration-username-006', password: 'r-p-6' },

        // username: IsUnique
        userData,
      ])(
        'it returns an error message if the data provided is invalid',
        ({ username, password }) => {
          return request(application.getHttpServer())
            .post('/register')
            .send({ username, password })
            .expect(HttpStatus.BAD_REQUEST);
        },
      );
    });
  });
});
