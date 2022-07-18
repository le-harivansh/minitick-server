import { Test } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApplicationModule } from '../src/application.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { User } from '../src/user/user.schema';

describe('Authentication Controller (e2e)', () => {
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

  describe('/authentication/login (POST)', () => {
    const userData: User = {
      username: 'auth_test_user',
      password: 'auth_test_passsword',
    };

    beforeAll(async () => {
      await request(application.getHttpServer())
        .post('/register')
        .send(userData)
        .expect(HttpStatus.CREATED);
    });

    // Password Authentication
    describe('Password Authentication', () => {
      it('returns an access token when the correct login credentials for an existing user are provided', async () => {
        const response = await request(application.getHttpServer())
          .post('/authentication/login')
          .send(userData);

        expect(response.statusCode).toBe(HttpStatus.CREATED);
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

          expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
          expect(response.body).toMatchObject({
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Unauthorized',
          });
        },
      );
    });

    // JWT Authentication
    describe('JWT Authentication', () => {
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

        expect(bearerAuthenticationResponse.statusCode).toBe(HttpStatus.OK);
      });

      it('returns error status-code when an incorrect Bearer token is provided', async () => {
        const bearerAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .get('/authentication/status')
          .set('Authorization', 'Bearer WRONG_bearer_authentication_token');

        expect(bearerAuthenticationResponse.statusCode).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      });
    });
  });
});
