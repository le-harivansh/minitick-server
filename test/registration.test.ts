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
      const registerUserDto: RegisterUserDto = {
        username: 'registration-username-001',
        password: 'registration-password-001',
      };

      afterEach(async () => {
        await userModel
          .findOneAndDelete({ username: registerUserDto.username })
          .exec();
      });

      test("it returns the 'created' HTTP status-code", () => {
        return request(application.getHttpServer())
          .post('/register')
          .send(registerUserDto)
          .expect(HttpStatus.CREATED);
      });

      test('it saves a new user to the database', async () => {
        await request(application.getHttpServer())
          .post('/register')
          .send(registerUserDto)
          .expect(HttpStatus.CREATED);

        expect(
          userModel.findOne({ username: registerUserDto.username }).exec(),
        ).resolves.toMatchObject({ username: registerUserDto.username });
      });
    });

    describe('for an unsuccessful user registration', () => {
      const registerUserDto: RegisterUserDto = {
        username: 'registration-username-002',
        password: 'registration-password-002',
      };

      beforeAll(async () => {
        await request(application.getHttpServer())
          .post('/register')
          .send(registerUserDto)
          .expect(HttpStatus.CREATED);
      });

      afterAll(async () => {
        await userModel
          .findOneAndDelete({ username: registerUserDto.username })
          .exec();
      });

      test.each([
        // IsNotEmpty
        { username: '', password: '' },
        { username: 'registration-username-003', password: '' },
        { username: '', password: 'registration-password-003' },

        // IsString
        { username: 4444, password: 88888888 },

        // username: MinLength(4)
        { username: 'ru5', password: 'registration-password-004' },

        // password: MinLength(8)
        { username: 'registration-username-005', password: 'r-p-6' },

        // username: IsUnique
        registerUserDto,
      ])(
        'it returns an error message if the payload is invalid',
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
