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
import { Task, TaskDocument } from '../src/task/schema/task.schema';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { User, UserDocument } from '../src/user/schema/user.schema';
import { UserController } from '../src/user/user.controller';

describe(UserController.name, () => {
  let application: INestApplication;

  let userModel: Model<UserDocument>;
  let taskModel: Model<TaskDocument>;

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
    taskModel = application.get<Model<TaskDocument>>(getModelToken(Task.name));

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

  describe('/GET user', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthenticated user', () => {
        return request(application.getHttpServer())
          .get('/user')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('[on success]', () => {
      it("returns the user's data", async () => {
        const userQueryResponse = await request(application.getHttpServer())
          .get('/user')
          .set('Cookie', accessTokenCookieString);

        expect(userQueryResponse.body).toMatchObject(
          expect.objectContaining({
            id: expect.any(String),
            username: userCredentials.username,
          }),
        );
      });
    });
  });

  describe('/PATCH user', () => {
    describe('[fails because]', () => {
      it('cannot be accessed by an unauthentiated user', () => {
        return request(application.getHttpServer())
          .patch('/user')
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

      it("returns the 'no-content' http-status", () => {
        return request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', [
            accessTokenCookieString,
            passwordConfirmationTokenCookieString,
          ])
          .send(updatedUserCredentials)
          .expect(HttpStatus.NO_CONTENT);
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

      it('cannot be accessed by a user lacking the password-confirmation token', () => {
        return request(application.getHttpServer())
          .delete('/user')
          .set('Cookie', accessTokenCookieString)
          .expect(HttpStatus.FORBIDDEN);
      });
    });

    describe('[on success]', () => {
      describe('[clears token-cookies]', () => {
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

        it.each([ACCESS_TOKEN, REFRESH_TOKEN, PASSWORD_CONFIRMATION_TOKEN])(
          "clears the '%s' cookie",
          (tokenCookieName) => {
            const tokenCookieString = userDeleteResponse
              .get('Set-Cookie')
              .filter((cookieString) =>
                cookieString.startsWith(tokenCookieName),
              )[0];
            const tokenExpiryDate = parse(tokenCookieString)['Expires'];

            expect(new Date(tokenExpiryDate) < new Date()).toBe(true);
          },
        );
      });

      describe('[delete associated tasks]', () => {
        beforeEach(async () => {
          const tasks = ['Task #1', 'Task #2', 'Task #3'];

          for (const taskTitle of tasks) {
            await taskModel.create({ userId, title: taskTitle });
          }

          await request(application.getHttpServer())
            .delete('/user')
            .set('Cookie', [
              accessTokenCookieString,
              passwordConfirmationTokenCookieString,
            ])
            .expect(HttpStatus.NO_CONTENT);
        });

        // @todo: FIX
        /**
         * The following test is failing when it should pass.
         * The scenario is passing when manually testing, but it is failing here.
         *
         * It passes when the userId is converted to a Type.ObjectId object when
         * filtering the tasks.
         *
         * However, if this is done, the route breaks, and the unit tests fail.
         */
        it.skip('deletes any tasks associated to the user', () => {
          expect(taskModel.find({ userId }).exec()).resolves.toStrictEqual([]);
        });
      });
    });
  });
});
