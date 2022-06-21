import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApplicationModule } from '../src/application.module';
import { RegistrationDto } from '../src/registration/dto/registration.dto';
import { Connection, Model } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { User, UserDocument } from '../src/user/user.schema';

describe('Application (e2e)', () => {
  let application: INestApplication;
  let mongooseConnection: Connection;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    mongooseConnection = application.get<Connection>(getConnectionToken());
    userModel = application.get<Model<UserDocument>>(getModelToken(User.name));

    await application.init();
  });

  afterAll(async () => {
    await mongooseConnection.dropDatabase();
    await application.close();
  });

  afterEach(async () => {
    await userModel.deleteMany().exec();
  });

  // User Registration
  describe('User Registration', () => {
    it('returns success status-code on user registration', async () => {
      const registrationDto: RegistrationDto = {
        username: 'OneIsTwo',
        password: 'corr3ct_passW0rd',
      };

      const response = await request(application.getHttpServer())
        .post('/register')
        .send(registrationDto);

      expect(response.statusCode).toBe(201);
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

      // MinLength(4) --> username
      { username: 'one', password: 'a_password' },

      // MinLength(8) --> password
      { username: 'aproperUSERNAME', password: 'nope' },
    ])(
      "returns an error message if the credentials provided are invalid {username: '$username', password: '$password'}",
      async ({ username, password }) => {
        const response = await request(application.getHttpServer())
          .post('/register')
          .send({ username, password });

        expect(response.statusCode).toBe(400);
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

      expect(registrationResponse.statusCode).toBe(201);

      const reRegistrationResponse = await request(application.getHttpServer())
        .post('/register')
        .send(userData);

      expect(reRegistrationResponse.statusCode).toBe(400);
      expect(reRegistrationResponse.body).toMatchObject({
        statusCode: 400,
        message: [
          `username '${userData.username}' already exists in the database.`,
        ],
        error: 'Bad Request',
      });
    });
  });

  describe('User Authentication', () => {
    const userData: User = {
      username: 'one_TWO',
      password: 'a_correct_passsw0rD',
    };

    beforeEach(async () => {
      await request(application.getHttpServer())
        .post('/register')
        .send(userData)
        .expect(201);
    });

    // Password Authentication
    describe('Password', () => {
      it('returns an access token when the correct login credentials for an existing user are provided', async () => {
        const response = await request(application.getHttpServer())
          .post('/authentication/login')
          .send(userData);

        expect(response.statusCode).toBe(201);
        expect(Object.keys(response.body)).toContainEqual('access_token');
      });

      it.each([
        { username: userData.username, password: 'wrong_password' },
        { username: 'inexistantuser.username', password: userData.password },
        { username: '', password: '' },
      ])(
        'returns error messages when incorrect login credentials are provided {username: $username, password: $password}',
        async ({ username, password }) => {
          const response = await request(application.getHttpServer())
            .post('/authentication/login')
            .send({ username, password });

          expect(response.statusCode).toBe(401);
          expect(response.body).toMatchObject({
            statusCode: 401,
            message: 'Unauthorized',
          });
        },
      );
    });

    // Bearer Authentication
    describe('Bearer Token', () => {
      it('returns success status-code when a correct Bearer token is provided', async () => {
        const localAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .post('/authentication/login')
          .send(userData);

        const accessToken: string =
          localAuthenticationResponse.body.access_token;

        const bearerAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .get('/authentication/status')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(bearerAuthenticationResponse.statusCode).toBe(200);
      });

      it('returns error status-code when an incorrect Bearer token is provided', async () => {
        const bearerAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .get('/authentication/status')
          .set('Authorization', 'Bearer WRONG_bearer_authentication_token');

        expect(bearerAuthenticationResponse.statusCode).toBe(401);
      });
    });
  });
});
