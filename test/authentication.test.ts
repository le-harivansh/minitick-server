import { HttpStatus, INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from '../src/authentication/constants';
import { User } from '../src/user/schema/user.schema';

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

  describe('Authentication', () => {
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
    describe('/authentication/login (POST)', () => {
      it('returns a cookie with the access token when the correct login credentials for an existing user are provided', async () => {
        const loginResponse = await request(application.getHttpServer())
          .post('/authentication/login')
          .send(userData);

        expect(loginResponse.statusCode).toBe(HttpStatus.OK);
        expect(
          loginResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN_KEY)),
        ).toHaveLength(1);
        expect(
          loginResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN_KEY)),
        ).toHaveLength(1);
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

    // Refresh-Token Authentication
    describe('/authentication/refresh (GET)', () => {
      it('returns new token-pair when visiting the route with a valid refresh-token', async () => {
        const localAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .post('/authentication/login')
          .send(userData);

        const refreshTokensResponse = await request(application.getHttpServer())
          .get('/authentication/refresh')
          .set('Cookie', [...localAuthenticationResponse.get('Set-Cookie')]);

        expect(localAuthenticationResponse.statusCode).toBe(HttpStatus.OK);

        expect(
          refreshTokensResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN_KEY)),
        ).toHaveLength(1);
        expect(
          refreshTokensResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN_KEY)),
        ).toHaveLength(1);

        expect(refreshTokensResponse).not.toContain(
          localAuthenticationResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN_KEY)),
        );
        expect(refreshTokensResponse).not.toContain(
          localAuthenticationResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN_KEY)),
        );
      });

      // it('saves a hashed version of the refresh token whenever a new one is generated via /refresh')
      // it('saves a hashed version of the refresh token whenever a new one is generated during authentication')
    });
  });
});
