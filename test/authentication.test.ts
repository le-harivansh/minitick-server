import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { useContainer } from 'class-validator';
import { parse } from 'cookie';
import { signedCookie } from 'cookie-parser';
import { Model } from 'mongoose';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import { AuthenticationConfiguration } from '../src/authentication/authentication.config';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../src/authentication/constants';
import { CookieConfiguration } from '../src/cookie/cookie.config';
import { User, UserDocument } from '../src/user/schema/user.schema';

describe('User Authentication', () => {
  let application: INestApplication;
  let configService: ConfigService;
  let jwtService: JwtService;

  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    configService = application.get(ConfigService);
    jwtService = application.get(JwtService);

    userModel = application.get<Model<UserDocument>>(getModelToken(User.name));

    useContainer(application.select(ApplicationModule), {
      fallbackOnErrors: true,
    });

    await application.init();
  });

  afterAll(async () => {
    await application.close();
  });

  describe('/POST login', () => {
    describe('for a successful authentication attempt', () => {
      const userCredentials: Pick<User, 'username' | 'password'> = {
        username: 'authentication-username-001',
        password: 'authentication-password-001',
      };

      let userId: string;

      let cookieSecret: string;

      beforeAll(() => {
        cookieSecret =
          configService.getOrThrow<CookieConfiguration['secret']>(
            'cookie.secret',
          );
      });

      beforeEach(async () => {
        await request(application.getHttpServer())
          .post('/register')
          .send(userCredentials)
          .expect(HttpStatus.CREATED);

        userId = (
          await userModel.findOne({ username: userCredentials.username }).exec()
        )._id;
      });

      afterEach(async () => {
        await userModel.findByIdAndDelete(userId).exec();
      });

      test("it returns the 'success' status code", () => {
        return request(application.getHttpServer())
          .post('/login')
          .send(userCredentials)
          .expect(HttpStatus.OK);
      });

      describe('[access_token]', () => {
        test('an access-token is returned in a cookie', async () => {
          const loginResponse = await request(application.getHttpServer())
            .post('/login')
            .send(userCredentials);

          expect(
            loginResponse
              .get('Set-Cookie')
              .filter((cookieString: string) =>
                cookieString.startsWith(ACCESS_TOKEN),
              ),
          ).toHaveLength(1);
        });

        test('the returned access-token contains appropriate data', async () => {
          const loginResponse = await request(application.getHttpServer())
            .post('/login')
            .send(userCredentials);

          const accessTokenCookieString = loginResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(ACCESS_TOKEN),
            )[0];

          const accessToken = signedCookie(
            parse(accessTokenCookieString)[ACCESS_TOKEN],
            cookieSecret,
          ) as string;

          const accessTokenSecret = configService.getOrThrow<
            AuthenticationConfiguration['jwt']['accessToken']['secret']
          >('authentication.jwt.accessToken.secret');

          expect(
            jwtService.verify(accessToken, { secret: accessTokenSecret }),
          ).toMatchObject({ sub: userId });
        });
      });

      describe('[refresh_token]', () => {
        test('a refresh-token is returned in a cookie', async () => {
          const loginResponse = await request(application.getHttpServer())
            .post('/login')
            .send(userCredentials);

          expect(
            loginResponse
              .get('Set-Cookie')
              .filter((cookieString: string) =>
                cookieString.startsWith(REFRESH_TOKEN),
              ),
          ).toHaveLength(1);
        });

        test('the returned refresh-token contains appropriate data', async () => {
          const loginResponse = await request(application.getHttpServer())
            .post('/login')
            .send(userCredentials);

          const refreshTokenCookieString = loginResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(REFRESH_TOKEN),
            )[0];

          const refreshToken = signedCookie(
            parse(refreshTokenCookieString)[REFRESH_TOKEN],
            cookieSecret,
          ) as string;

          const refreshTokenSecret = configService.getOrThrow<
            AuthenticationConfiguration['jwt']['refreshToken']['secret']
          >('authentication.jwt.refreshToken.secret');

          expect(
            jwtService.verify(refreshToken, { secret: refreshTokenSecret }),
          ).toMatchObject({ sub: userId });
        });

        test('a hash of the returned refresh-token is saved in the database', async () => {
          const loginResponse = await request(application.getHttpServer())
            .post('/login')
            .send(userCredentials);

          const refreshTokenCookieString = loginResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(REFRESH_TOKEN),
            )[0];

          const refreshToken = signedCookie(
            parse(refreshTokenCookieString)[REFRESH_TOKEN],
            cookieSecret,
          ) as string;

          const hashedRefreshTokens = (await userModel.findById(userId).exec())
            .hashedRefreshTokens;

          expect(
            (
              await Promise.all(
                hashedRefreshTokens.map(async ({ hash }) =>
                  verify(hash, refreshToken),
                ),
              )
            ).some(Boolean),
          ).toBeTruthy();
        });
      });
    });
  });
});
