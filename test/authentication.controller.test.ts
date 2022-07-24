import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { parse } from 'cookie';
import { signedCookie } from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';

import { AuthenticationModule } from '../src/authentication/authentication.module';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../src/authentication/constants';
import { CookieConfiguration } from '../src/cookie/cookie.config';
import { CookieModule } from '../src/cookie/cookie.module';
import { RegistrationModule } from '../src/registration/registration.module';
import { User, UserDocument } from '../src/user/schema/user.schema';

/**
 * Setting a timeout of 10 seconds for this test-file.
 * Otherwise, jest will randomly complain.
 *
 * Pretty sure this is because of MongoMemoryServer. But then again - why?
 */
jest.setTimeout(15 * 1000);

describe('AuthenticationController (e2e)', () => {
  let application: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  let configService: ConfigService;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        MongooseModule.forRootAsync({
          async useFactory() {
            mongoMemoryServer = await MongoMemoryServer.create();

            return { uri: mongoMemoryServer.getUri() };
          },
        }),
        CookieModule,
        AuthenticationModule,
        RegistrationModule,
      ],
    }).compile();

    application = moduleFixture.createNestApplication();
    configService = application.get(ConfigService);
    userModel = application.get<Model<UserDocument>>(getModelToken(User.name));

    await application.init();
  });

  afterAll(async () => {
    await mongoMemoryServer.stop();
    await application.close();
  });

  describe('Authentication', () => {
    const userData: User = {
      username: 'auth_test_user',
      password: 'auth_test_passsword',
    };

    beforeEach(async () => {
      await request(application.getHttpServer())
        .post('/register')
        .send(userData)
        .expect(HttpStatus.CREATED);
    });

    afterEach(async () => {
      await userModel.deleteMany();
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
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN)),
        ).toHaveLength(1);
        expect(
          loginResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN)),
        ).toHaveLength(1);
      });

      it('saves a hash of the returned refresh-token to the database', async () => {
        const loginResponse = await request(application.getHttpServer())
          .post('/authentication/login')
          .send(userData);

        const refreshTokenCookieString = loginResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(REFRESH_TOKEN),
          )[0];
        const secret =
          configService.getOrThrow<CookieConfiguration['secret']>(
            'cookie.secret',
          );
        const refreshToken = signedCookie(
          parse(refreshTokenCookieString)[REFRESH_TOKEN],
          secret,
        ) as string;
        const retrievedUser = await userModel
          .findOne({ username: userData.username })
          .exec();

        expect(
          verify(retrievedUser.hashedRefreshTokens[0].hash, refreshToken),
        ).resolves.toBeTruthy();
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
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN)),
        ).toHaveLength(1);
        expect(
          refreshTokensResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN)),
        ).toHaveLength(1);

        expect(refreshTokensResponse).not.toContain(
          localAuthenticationResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(ACCESS_TOKEN)),
        );
        expect(refreshTokensResponse).not.toContain(
          localAuthenticationResponse
            .get('Set-Cookie')
            .filter((cookie: string) => cookie.startsWith(REFRESH_TOKEN)),
        );
      });

      it('saves a hash of the returned refresh-token to the database', async () => {
        const localAuthenticationResponse = await request(
          application.getHttpServer(),
        )
          .post('/authentication/login')
          .send(userData);

        const refreshTokensResponse = await request(application.getHttpServer())
          .get('/authentication/refresh')
          .set('Cookie', [...localAuthenticationResponse.get('Set-Cookie')]);

        const refreshTokenCookieString = refreshTokensResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(REFRESH_TOKEN),
          )[0];
        const secret =
          configService.getOrThrow<CookieConfiguration['secret']>(
            'cookie.secret',
          );
        const refreshToken = signedCookie(
          parse(refreshTokenCookieString)[REFRESH_TOKEN],
          secret,
        ) as string;
        const retrievedUser = await userModel
          .findOne({ username: userData.username })
          .exec();
        const hashedRefreshTokens = retrievedUser.hashedRefreshTokens.map(
          ({ hash }) => hash,
        );

        expect(
          (
            await Promise.all(
              hashedRefreshTokens.map(async (hashedRefreshToken) =>
                verify(hashedRefreshToken, refreshToken),
              ),
            )
          ).some(Boolean),
        ).toBeTruthy();
      });
    });
  });
});
