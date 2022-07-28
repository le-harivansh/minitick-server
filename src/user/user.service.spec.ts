import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { User, UserDocument, UserSchema } from './schema/user.schema';
import { UserService } from './user.service';

describe(UserService.name, () => {
  let application: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  let userService: UserService;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          async useFactory() {
            mongoMemoryServer = await MongoMemoryServer.create();

            return { uri: mongoMemoryServer.getUri() };
          },
        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow(key: string) {
              switch (key) {
                case 'authentication.jwt.refreshToken.duration':
                  return '15 minutes';

                default:
                  throw new Error(`Key '${key}' not found.`);
              }
            },
          },
        },
        UserService,
      ],
    }).compile();

    application = moduleFixture.createNestApplication();
    userService = application.get(UserService);
    userModel = application.get<Model<UserDocument>>(getModelToken(User.name));

    await application.init();
  });

  afterEach(async () => {
    await userModel.deleteMany();
  });

  afterAll(async () => {
    await mongoMemoryServer.stop();
    await application.close();
  });

  describe('createUser', () => {
    const userData: User = {
      username: 'le-user',
      password: 'nope.jpeg',
    };

    describe('when called', () => {
      test("it saves the provided user's data to the database", async () => {
        await userService.createUser(userData);

        expect(userModel.findOne(userData).exec()).resolves.toMatchObject(
          userData,
        );
      });
    });
  });

  describe('findByUsername', () => {
    const userData: User = {
      username: 'onetwo',
      password: 'wantoo',
    };

    beforeAll(async () => {
      await userModel.create(userData);
    });

    describe('when called', () => {
      test('it returns the corresponding user from the database', async () => {
        expect(
          userService.findByUsername(userData.username),
        ).resolves.toMatchObject(userData);
      });

      test('it returns undefined if the user could not be found in the database', async () => {
        expect(userService.findByUsername('non-existant-user')).resolves
          .toBeUndefined;
      });
    });
  });

  describe('updateUser', () => {
    const userData = {
      username: 'username-1000',
      password: 'password-1000',
    };

    let userId: string;

    beforeEach(async () => {
      userId = (await userModel.create(userData))._id;
    });

    describe('when called', () => {
      test("it updates the specified user's data using the provided payload", async () => {
        const newUsername = 'username-1111';

        expect(
          userModel.findOne({ username: newUsername }).exec(),
        ).resolves.toBeNull();

        await userService.updateUser(userData.username, {
          username: newUsername,
        });

        expect(
          userModel.findOne({ username: newUsername }).exec(),
        ).resolves.toMatchObject({
          _id: userId,
          username: newUsername,
        });
      });

      test('it hashes any provided password before updating it', async () => {
        const newPassword = 'password-1111';

        const { password: savedHashedPassword } = await userService.updateUser(
          userData.username,
          { password: newPassword },
        );

        expect(verify(savedHashedPassword, newPassword)).resolves.toBeTruthy();
      });
    });
  });

  describe('saveRefreshToken', () => {
    describe('when called', () => {
      test("it saves a hash of the refresh token to the user's refresh-token array", async () => {
        const userData: User = {
          username: 'zero',
          password: 'zero',
        };

        await userModel.create(userData);

        const plainRefreshToken = 'refresh-token';

        await userService.saveRefreshToken(
          userData.username,
          plainRefreshToken,
        );

        const retrievedUser = await userModel.findOne(userData).exec();
        const { hash: hashedRefreshToken } =
          retrievedUser.hashedRefreshTokens[0];

        expect(
          verify(hashedRefreshToken, plainRefreshToken),
        ).resolves.toBeTruthy();
      });

      test("it prunes a user's stale tokens", async () => {
        const userData: User = {
          username: 'username-01',
          password: 'le-password',
          hashedRefreshTokens: [
            {
              hash: 'expired-token',
              expiresOn: new Date(Date.now() + 1000 * 60 * 60 * -1), // 1 hour in the past
            },
            {
              hash: 'another-expired-token',
              expiresOn: new Date(Date.now() + 1000 * 60 * -10), // 10 minutes in the past
            },
            {
              hash: 'valid-token',
              expiresOn: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes in the future
            },
          ],
        };

        const newUser = await userModel.create(userData);

        expect(newUser.hashedRefreshTokens).toHaveLength(3);

        const newTokenPlain = 'new-token';

        await userService.saveRefreshToken(userData.username, newTokenPlain);

        const retrievedUser = await userModel
          .findOne({ username: userData.username })
          .exec();

        expect(retrievedUser.hashedRefreshTokens).toHaveLength(2); // prune 2 & add 1

        expect(
          retrievedUser.hashedRefreshTokens.filter(
            ({ hash }) => hash === 'valid-token',
          ),
        ).toHaveLength(1);

        expect(
          verify(
            retrievedUser.hashedRefreshTokens.filter(
              ({ hash }) => hash !== 'valid-token',
            )[0].hash,
            newTokenPlain,
          ),
        ).resolves.toBeTruthy();
      });
    });
  });
});
