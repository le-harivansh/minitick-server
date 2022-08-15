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

describe('Token regeneration', () => {
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

  describe('/GET refresh/access-token', () => {
    const userCredentials: Pick<User, 'username' | 'password'> = {
      username: 'token-refresh-username-001',
      password: 'token-refresh-password-001',
    };

    let userId: string;

    let cookieSecret: string;
    let currentRefreshTokenCookieString: string;

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

      const loginResponse = await request(application.getHttpServer())
        .post('/login')
        .send(userCredentials)
        .expect(HttpStatus.OK);

      currentRefreshTokenCookieString = loginResponse
        .get('Set-Cookie')
        .filter((cookieString: string) =>
          cookieString.startsWith(REFRESH_TOKEN),
        )[0];
    });

    afterEach(async () => {
      await userModel.findByIdAndDelete(userId).exec();
    });

    test("it returns the 'success' status code", () => {
      return request(application.getHttpServer())
        .get('/refresh/access-token')
        .set('Cookie', currentRefreshTokenCookieString)
        .expect(HttpStatus.OK);
    });

    test('it attaches an access-token to the response cookie', async () => {
      const refreshAccessTokenResponse = await request(
        application.getHttpServer(),
      )
        .get('/refresh/access-token')
        .set('Cookie', currentRefreshTokenCookieString);

      expect(
        refreshAccessTokenResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(ACCESS_TOKEN),
          ),
      ).toHaveLength(1);
    });

    test('the returned access-token contains appropriate data', async () => {
      const refreshAccessTokenResponse = await request(
        application.getHttpServer(),
      )
        .get('/refresh/access-token')
        .set('Cookie', currentRefreshTokenCookieString);

      const accessTokenCookieString = refreshAccessTokenResponse
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

  describe('/GET refresh/refresh-token', () => {
    const userCredentials: Pick<User, 'username' | 'password'> = {
      username: 'token-refresh-username-002',
      password: 'token-refresh-password-002',
    };

    let userId: string;

    let cookieSecret: string;
    let currentRefreshTokenCookieString: string;

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

      const loginResponse = await request(application.getHttpServer())
        .post('/login')
        .send(userCredentials)
        .expect(HttpStatus.OK);

      currentRefreshTokenCookieString = loginResponse
        .get('Set-Cookie')
        .filter((cookieString: string) =>
          cookieString.startsWith(REFRESH_TOKEN),
        )[0];
    });

    afterEach(async () => {
      await userModel.findByIdAndDelete(userId).exec();
    });

    test("it returns the 'success' status code", () => {
      return request(application.getHttpServer())
        .get('/refresh/refresh-token')
        .set('Cookie', currentRefreshTokenCookieString)
        .expect(HttpStatus.OK);
    });

    test('a refresh-token is returned in a cookie', async () => {
      const refreshTokenResponse = await request(application.getHttpServer())
        .get('/refresh/refresh-token')
        .set('Cookie', currentRefreshTokenCookieString);

      expect(
        refreshTokenResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(REFRESH_TOKEN),
          ),
      ).toHaveLength(1);
    });

    test('the returned refresh-token contains the appropriate data', async () => {
      const refreshTokenResponse = await request(application.getHttpServer())
        .get('/refresh/refresh-token')
        .set('Cookie', currentRefreshTokenCookieString);

      const refreshTokenCookieString = refreshTokenResponse
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
      const refreshTokenResponse = await request(application.getHttpServer())
        .get('/refresh/refresh-token')
        .set('Cookie', currentRefreshTokenCookieString);

      expect(
        (await userModel.findById(userId).exec()).hashedRefreshTokens,
      ).toHaveLength(2);

      const refreshTokenCookieString = refreshTokenResponse
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
