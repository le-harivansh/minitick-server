import { HttpStatus, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { Model } from 'mongoose';
import request, { Response } from 'supertest';

import { ApplicationModule } from '../src/application.module';
import {
  ACCESS_TOKEN,
  PASSWORD_CONFIRMATION_TOKEN,
  REFRESH_TOKEN,
} from '../src/authentication/constants';
import { TokenRefreshController } from '../src/authentication/controller/token-refresh.controller';
import { User, UserDocument } from '../src/user/schema/user.schema';

describe(TokenRefreshController.name, () => {
  let application: INestApplication;

  let userModel: Model<UserDocument>;

  const userCredentials: Pick<User, 'username' | 'password'> = {
    username: 'token-refresh-username',
    password: 'token-refresh-password',
  };

  let userId: string;

  let currentRefreshTokenCookieString: string;
  let currentAccessTokenCookieString: string;

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

    const loginResponse = await request(application.getHttpServer())
      .post('/login')
      .send(userCredentials)
      .expect(HttpStatus.OK);

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

  afterEach(async () => {
    await userModel.findByIdAndDelete(userId).exec();
  });

  afterAll(async () => {
    await application.close();
  });

  describe('/GET refresh/access-token', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .get('/refresh/access-token')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('[on success]', () => {
      let refreshAccessTokenResponse: Response;

      beforeEach(async () => {
        refreshAccessTokenResponse = await request(application.getHttpServer())
          .get('/refresh/access-token')
          .set('Cookie', currentRefreshTokenCookieString)
          .expect(HttpStatus.OK);
      });

      it('attaches an access-token cookie to the response', () => {
        expect(
          refreshAccessTokenResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(ACCESS_TOKEN),
            ),
        ).toHaveLength(1);
      });

      it('returns the access-token expiry timestamp', () => {
        expect(refreshAccessTokenResponse.body).toMatchObject(
          expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('/GET refresh/refresh-token', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .get('/refresh/refresh-token')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('[on success]', () => {
      let refreshRefreshTokenResponse: Response;

      beforeEach(async () => {
        refreshRefreshTokenResponse = await request(application.getHttpServer())
          .get('/refresh/refresh-token')
          .set('Cookie', currentRefreshTokenCookieString)
          .expect(HttpStatus.OK);
      });

      it('attaches a refresh-token cookie to the response', () => {
        expect(
          refreshRefreshTokenResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(REFRESH_TOKEN),
            ),
        ).toHaveLength(1);
      });

      it('returns the refresh-token expiry timestamp', () => {
        expect(refreshRefreshTokenResponse.body).toMatchObject(
          expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('/POST refresh/password-confirmation-token', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .post('/refresh/password-confirmation-token')
          .send({ password: userCredentials.password })
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('requires a password', () => {
        return request(application.getHttpServer())
          .post('/refresh/password-confirmation-token')
          .set('Cookie', currentAccessTokenCookieString)
          .expect(HttpStatus.BAD_REQUEST);
      });

      it("returns the 'unauthorized' http status-code if an incorrect password (for the currently authenticated user) is provided", () => {
        return request(application.getHttpServer())
          .post('/refresh/password-confirmation-token')
          .set('Cookie', currentAccessTokenCookieString)
          .send({ password: 'incorrect-password' })
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('[on success]', () => {
      let refreshPasswordConfirmationTokenResponse: Response;

      beforeEach(async () => {
        refreshPasswordConfirmationTokenResponse = await request(
          application.getHttpServer(),
        )
          .post('/refresh/password-confirmation-token')
          .set('Cookie', currentAccessTokenCookieString)
          .send({ password: userCredentials.password })
          .expect(HttpStatus.OK);
      });

      it('attaches a password-confirmation-token cookie to the response', async () => {
        expect(
          refreshPasswordConfirmationTokenResponse
            .get('Set-Cookie')
            .filter((cookieString: string) =>
              cookieString.startsWith(PASSWORD_CONFIRMATION_TOKEN),
            ),
        ).toHaveLength(1);
      });

      it('returns the password-confirmation-token expiry timestamp', () => {
        expect(refreshPasswordConfirmationTokenResponse.body).toMatchObject(
          expect.objectContaining({
            expiresAt: expect.any(Number),
          }),
        );
      });
    });
  });
});
