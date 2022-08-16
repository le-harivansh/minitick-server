import { HttpStatus, INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { parse } from 'cookie';
import { Model } from 'mongoose';
import request, { Response } from 'supertest';

import { ApplicationModule } from '../src/application.module';
import {
  ACCESS_TOKEN,
  PASSWORD_CONFIRMATION_TOKEN,
  REFRESH_TOKEN,
} from '../src/authentication/constants';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { User, UserDocument } from '../src/user/schema/user.schema';
import { UserController } from '../src/user/user.controller';

describe(UserController.name, () => {
  let application: INestApplication;

  let userModel: Model<UserDocument>;

  const userCredentials: Pick<User, 'username' | 'password'> = {
    username: 'update-delete-username-001',
    password: 'update-delete-password-001',
  };

  let userId: string;

  let accessTokenCookieString: string;
  let passwordConfirmationTokenCookieString: string;

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

    accessTokenCookieString = loginResponse
      .get('Set-Cookie')
      .filter((cookieString) => cookieString.startsWith(ACCESS_TOKEN))[0];

    passwordConfirmationTokenCookieString = loginResponse
      .get('Set-Cookie')
      .filter((cookieString) =>
        cookieString.startsWith(PASSWORD_CONFIRMATION_TOKEN),
      )[0];
  });

  afterEach(async () => {
    await userModel.findByIdAndDelete(userId).exec();
  });

  afterAll(async () => {
    await application.close();
  });

  describe('/PATCH user', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .patch('/user')
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('cannot be accessed by a user lacking an access-token', () => {
        return request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', passwordConfirmationTokenCookieString)
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('cannot be accessed by a user lacking the password-confirmation token', () => {
        return request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', accessTokenCookieString)
          .expect(HttpStatus.FORBIDDEN);
      });

      it.each<{ [Property in keyof Omit<UpdateUserDto, '_'>]: unknown }>([
        // empty payload
        {},

        // username: IsString
        { username: 4444 },
        { username: 5555, password: 'valid-password' },

        // username: MinLength(4)
        { username: 'no' },
        { username: 'NO', password: 'valid-password' },

        // username: IsUnique
        { username: userCredentials.username },
        { username: userCredentials.username, password: 'valid-password' },

        // password: MinLength(8)
        { password: 'nope' },
        { username: 'valid-username', password: 'nope' },
      ])('payload is invalid [$username, $password]', (updateUserDto) => {
        return request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', [
            accessTokenCookieString,
            passwordConfirmationTokenCookieString,
          ])
          .send(updateUserDto)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('[on success]', () => {
      const updatedUserCredentials = {
        username: 'updated-username-001',
        password: 'updated-password-001',
      };

      let userUpdateResponse: Response;

      beforeEach(async () => {
        userUpdateResponse = await request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', [
            accessTokenCookieString,
            passwordConfirmationTokenCookieString,
          ])
          .send(updatedUserCredentials)
          .expect(HttpStatus.OK);
      });

      it("returns the updated user's data", () => {
        expect(userUpdateResponse.body).toMatchObject({
          id: loginResponse.body['id'],
          username: updatedUserCredentials.username,
        });
      });
    });
  });

  describe('/DELETE user', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .delete('/user')
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('cannot be accessed by a user lacking an access-token', () => {
        return request(application.getHttpServer())
          .delete('/user')
          .set('Cookie', passwordConfirmationTokenCookieString)
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('cannot be accessed by a user lacking the password-confirmation token', () => {
        return request(application.getHttpServer())
          .delete('/user')
          .set('Cookie', accessTokenCookieString)
          .expect(HttpStatus.FORBIDDEN);
      });
    });

    describe('[on success]', () => {
      let userDeleteResponse: Response;

      beforeEach(async () => {
        userDeleteResponse = await request(application.getHttpServer())
          .delete('/user')
          .set('Cookie', [
            accessTokenCookieString,
            passwordConfirmationTokenCookieString,
          ])
          .expect(HttpStatus.NO_CONTENT);
      });

      it('clears the access-token cookie', () => {
        const accessTokenCookie = userDeleteResponse
          .get('Set-Cookie')
          .filter((cookieString) => cookieString.startsWith(ACCESS_TOKEN))[0];

        const accessTokenCookieExpirationDate =
          parse(accessTokenCookie)['Expires'];

        expect(
          new Date(accessTokenCookieExpirationDate) <= new Date(),
        ).toBeTruthy();
      });

      it('clears the refresh-token cookie', () => {
        const refreshTokenCookie = userDeleteResponse
          .get('Set-Cookie')
          .filter((cookieString) => cookieString.startsWith(REFRESH_TOKEN))[0];

        const refreshTokenCookieExpirationDate =
          parse(refreshTokenCookie)['Expires'];

        expect(
          new Date(refreshTokenCookieExpirationDate) <= new Date(),
        ).toBeTruthy();
      });

      it('clears the password-confirmation-token cookie', () => {
        const passwordConfirmationTokenCookie = userDeleteResponse
          .get('Set-Cookie')
          .filter((cookieString) =>
            cookieString.startsWith(PASSWORD_CONFIRMATION_TOKEN),
          )[0];

        const passwordConfirmationTokenCookieExpirationDate = parse(
          passwordConfirmationTokenCookie,
        )['Expires'];

        expect(
          new Date(passwordConfirmationTokenCookieExpirationDate) <= new Date(),
        ).toBeTruthy();
      });
    });
  });
});
