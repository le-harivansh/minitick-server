import { HttpStatus, INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import { RegistrationDto } from '../src/registration/dto/registration.dto';

describe('Registration Controller (e2e)', () => {
  let application: INestApplication;
  let mongooseConnection: Connection;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    mongooseConnection = application.get<Connection>(getConnectionToken());

    await application.init();
  });

  afterAll(async () => {
    await mongooseConnection.dropDatabase();
    await application.close();
  });

  describe('/regiser (POST)', () => {
    it('returns success status-code on user registration', async () => {
      const registrationDto: RegistrationDto = {
        username: 'registration_test_username',
        password: 'registration_test_password',
      };

      const response = await request(application.getHttpServer())
        .post('/register')
        .send(registrationDto);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
    });

    it.each([
      // IsNotEmpty
      { username: '', password: '' },
      { username: 'OneTwo', password: '' },
      { username: '', password: 'LePassword' },

      // IsString
      { username: 44, password: 55 },
      { username: 'FourtyFour', password: 55 },
      { username: 44, password: 'FiftyFive' },

      // username: MinLength(4)
      { username: 'one', password: 'a_password' },

      // password: MinLength(8)
      { username: 'aproperUSERNAME', password: 'nope' },
    ])(
      "returns an error message if the credentials provided are invalid {username: '$username', password: '$password'}",
      async ({ username, password }) => {
        const response = await request(application.getHttpServer())
          .post('/register')
          .send({ username, password });

        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      },
    );

    it('returns an error message if a user already exists in the database', async () => {
      const userData: RegistrationDto = {
        username: 'OneIsOne',
        password: 'corr3ct_passW0rd_yep',
      };

      const registrationResponse = await request(application.getHttpServer())
        .post('/register')
        .send(userData);

      expect(registrationResponse.statusCode).toBe(HttpStatus.CREATED);

      const reRegistrationResponse = await request(application.getHttpServer())
        .post('/register')
        .send(userData);

      expect(reRegistrationResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(reRegistrationResponse.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: [
          `username '${userData.username}' already exists in the database.`,
        ],
        error: 'Bad Request',
      });
    });
  });
});
