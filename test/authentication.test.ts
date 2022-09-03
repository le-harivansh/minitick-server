import { HttpStatus, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { parse } from 'cookie';
import { Model } from 'mongoose';
import { Response } from 'superagent';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import {
  ACCESS_TOKEN,
  PASSWORD_CONFIRMATION_TOKEN,
  REFRESH_TOKEN,
} from '../src/authentication/constants';
import { AuthenticationController } from '../src/authentication/controller/authentication.controller';
import { LogoutScope } from '../src/authentication/dto/logout.dto';
import { User, UserDocument } from '../src/user/schema/user.schema';

describe(AuthenticationController.name, () => {
  let application: INestApplication;

  let userModel: Model<UserDocument>;
  let userId: string;

  const userCredentials: Pick<User, 'username' | 'password'> = {
    username: 'authentication-username',
    password: 'authentication-password',
  };

  let loginResponse: Response;

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

  beforeEach(async () => {
    await request(application.getHttpServer())
      .post('/register')
      .send(userCredentials)
      .expect(HttpStatus.CREATED);

    userId = (
      await userModel.findOne({ username: userCredentials.username }).exec()
    )._id;

    loginResponse = await request(application.getHttpServer())
      .post('/login')
      .send(userCredentials)
      .expect(HttpStatus.OK);
  });

  afterEach(async () => {
    await userModel.findByIdAndDelete(userId).exec();
  });

  afterAll(async () => {
    await application.close();
  });

  describe('/POST login', () => {
    it.each([ACCESS_TOKEN, REFRESH_TOKEN, PASSWORD_CONFIRMATION_TOKEN])(
      "returns a(n) '%s' cookie",
      (tokenCookieName) => {
        expect(
          loginResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(tokenCookieName),
            ),
        ).toHaveLength(1);
      },
    );

    it('returns the expiry times of the returned: access-token, refresh-token & password-confirmation-token', () => {
      expect(loginResponse.body).toMatchObject(
        expect.objectContaining({
          accessToken: expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
          refreshToken: expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
          passwordConfirmationToken: expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('/POST logout', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .post('/logout')
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('cannot be called with an invalid scope', async () => {
        const currentAccessTokenCookieString = loginResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(ACCESS_TOKEN),
          )[0];

        return request(application.getHttpServer())
          .post('/logout')
          .set('Cookie', currentAccessTokenCookieString)
          .send({ scope: 'invalid-scope' })
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('[on success]', () => {
      let currentAccessTokenCookieString: string;
      let currentRefreshTokenCookieString: string;

      beforeEach(async () => {
        currentAccessTokenCookieString = loginResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(ACCESS_TOKEN),
          )[0];

        currentRefreshTokenCookieString = loginResponse
          .get('Set-Cookie')
          .filter((cookieString: string) =>
            cookieString.startsWith(REFRESH_TOKEN),
          )[0];
      });

      describe(`[scope = '${LogoutScope.CURRENT_SESSION}']`, () => {
        let logoutResponse: Response;

        beforeEach(async () => {
          logoutResponse = await request(application.getHttpServer())
            .post('/logout')
            .set('Cookie', [
              currentAccessTokenCookieString,
              currentRefreshTokenCookieString,
            ])
            .expect(HttpStatus.NO_CONTENT);
        });

        it(`returns the 'no-content' http-status code when scope is manually set to '${LogoutScope.CURRENT_SESSION}'`, () => {
          return request(application.getHttpServer())
            .post('/logout')
            .set('Cookie', [
              currentAccessTokenCookieString,
              currentRefreshTokenCookieString,
            ])
            .send({ scope: LogoutScope.CURRENT_SESSION })
            .expect(HttpStatus.NO_CONTENT);
        });

        it.each([ACCESS_TOKEN, REFRESH_TOKEN, PASSWORD_CONFIRMATION_TOKEN])(
          "clears the '%s' cookie",
          (tokenCookieName) => {
            const tokenCookieString = logoutResponse
              .get('Set-Cookie')
              .filter((cookieString) =>
                cookieString.startsWith(tokenCookieName),
              )[0];
            const tokenExpiryDate = parse(tokenCookieString)['Expires'];

            expect(new Date(tokenExpiryDate) < new Date()).toBe(true);
          },
        );
      });

      describe(`[scope = '${LogoutScope.OTHER_SESSIONS}']`, () => {
        it("returns the 'no-content' http-status code", () => {
          return request(application.getHttpServer())
            .post('/logout')
            .set('Cookie', [
              currentAccessTokenCookieString,
              currentRefreshTokenCookieString,
            ])
            .expect(HttpStatus.NO_CONTENT);
        });
      });
    });
  });
});
