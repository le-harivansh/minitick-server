import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { useContainer } from 'class-validator';
import { Model } from 'mongoose';
import request from 'supertest';

import { ApplicationModule } from '../src/application.module';
import { ACCESS_TOKEN } from '../src/authentication/constants';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { User, UserDocument } from '../src/user/schema/user.schema';

describe('User', () => {
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

  describe('/PATCH user', () => {
    const userCredentials: Pick<User, 'username' | 'password'> = {
      username: 'update-username-001',
      password: 'update-password-001',
    };

    let userId: string;
    let accessTokenCookieString: string;

    beforeEach(async () => {
      await request(application.getHttpServer())
        .post('/register')
        .send(userCredentials)
        .expect(HttpStatus.CREATED);

      userId = (
        await userModel.findOne({ username: userCredentials.username }).exec()
      )._id;

      const loginResponse = await request(application.getHttpServer())
        .post('/authentication/login')
        .send(userCredentials)
        .expect(HttpStatus.OK);

      accessTokenCookieString = loginResponse
        .get('Set-Cookie')
        .filter((cookieString) => cookieString.startsWith(ACCESS_TOKEN))[0];
    });

    afterEach(async () => {
      await userModel.findByIdAndDelete(userId).exec();
    });

    test('it cannot be accessed by unauthentiated users', () => {
      return request(application.getHttpServer())
        .patch('/user')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    describe('for a successful user-update attempt', () => {
      test("it returns HttpStatus 'OK'", () => {
        return request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', accessTokenCookieString)
          .send({
            username: 'updated-username-001',
            password: 'updated-password-001',
          })
          .expect(HttpStatus.OK);
      });

      test("it updates the specified user's username", async () => {
        const newUsername = 'updated-username-002';

        expect(
          userModel.findOne({ username: newUsername }).exec(),
        ).resolves.toBeNull();

        await request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', accessTokenCookieString)
          .send({ username: newUsername });

        expect(
          userModel.findOne({ username: newUsername }).exec(),
        ).resolves.toMatchObject({
          _id: userId,
          username: newUsername,
        });
      });

      test("it hashes the specified user's password before updating it", async () => {
        const newPassword = 'updated-password-003';

        await request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', accessTokenCookieString)
          .send({ password: newPassword });

        const { password: savedHashedPassword } = await userModel
          .findOne({ username: userCredentials.username })
          .exec();

        expect(verify(savedHashedPassword, newPassword)).resolves.toBeTruthy();
      });

      test("it updates the specified user's username & password", async () => {
        const newUserData: Pick<User, 'username' | 'password'> = {
          username: 'new-username-004',
          password: 'new-password-004',
        };

        expect(
          userModel.findOne({ username: newUserData.username }).exec(),
        ).resolves.toBeNull();

        await request(application.getHttpServer())
          .patch('/user')
          .set('Cookie', accessTokenCookieString)
          .send(newUserData);

        const { _id, password: savedHashedPassword } = await userModel
          .findOne({ username: newUserData.username })
          .exec();

        expect(_id).toEqual(userId);
        expect(
          verify(savedHashedPassword, newUserData.password),
        ).resolves.toBeTruthy();
      });
    });

    describe('for an unsuccessful user-update attempt', () => {
      test.each<{ [Property in keyof Omit<UpdateUserDto, '_'>]: unknown }>([
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
      ])(
        'it returns an error message if the payload is invalid',
        (updateUserDto) => {
          return request(application.getHttpServer())
            .patch('/user')
            .set('Cookie', accessTokenCookieString)
            .send(updateUserDto)
            .expect(HttpStatus.BAD_REQUEST);
        },
      );
    });
  });
});
