import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';
import { ObjectId } from 'mongodb';
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

        expect(
          userModel.findOne({ username: userData.username }).exec(),
        ).resolves.toMatchObject({
          username: userData.username,
        });
      });

      test("it hashes the user's password before saving it", async () => {
        await userService.createUser(userData);

        const { password: hashedPassword } = await userModel
          .findOne({ username: userData.username })
          .exec();

        expect(verify(hashedPassword, userData.password)).resolves.toBeTruthy();
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

  describe('findById', () => {
    const userData: User = {
      username: 'threefour',
      password: 'sureefoar',
    };

    let userId: string;

    beforeAll(async () => {
      userId = (await userModel.create(userData))._id;
    });

    describe('when called', () => {
      test('it returns the corresponding user from the database', async () => {
        expect(userService.findById(userId)).resolves.toMatchObject(userData);
      });

      test('it returns null if the user could not be found in the database', async () => {
        expect(
          userService.findById(new ObjectId().toString()),
        ).resolves.toBeNull();
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
      test("it updates the specified user's (non-password) data using the provided payload", async () => {
        const newUsername = 'username-1111';

        expect(
          userModel.findOne({ username: newUsername }).exec(),
        ).resolves.toBeNull();

        await userService.updateUser(userId, {
          username: newUsername,
        });

        expect(userModel.findById(userId).exec()).resolves.toMatchObject({
          username: newUsername,
        });
      });

      test('it hashes any provided user-password before updating it', async () => {
        const newPassword = 'password-1111';

        await userService.updateUser(userId, { password: newPassword });

        const savedHashedPassword = (await userModel.findById(userId).exec())
          .password;

        expect(verify(savedHashedPassword, newPassword)).resolves.toBeTruthy();
      });

      test("it updates the specified user's (full) data using the provided payload", async () => {
        const newUserData: Pick<User, 'username' | 'password'> = {
          username: 'username-xxxx',
          password: 'password-xxxx',
        };

        await userService.updateUser(userId, newUserData);

        const updatedUser = await userModel.findById(userId).exec();

        expect(
          verify(updatedUser.password, newUserData.password),
        ).resolves.toBeTruthy();

        expect(userModel.findById(userId).exec()).resolves.toMatchObject({
          username: newUserData.username,
        });
      });
    });
  });

  describe('saveHashedRefreshToken', () => {
    describe('when called', () => {
      test("it saves a hash of the refresh token to the user's refresh-token array", async () => {
        const userData: User = {
          username: 'zero',
          password: 'zero',
        };

        const userId = (await userModel.create(userData))._id;

        const plainRefreshToken = 'refresh-token';

        await userService.saveHashedRefreshToken(userId, plainRefreshToken);

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

        await userService.saveHashedRefreshToken(newUser._id, newTokenPlain);

        const retrievedUser = await userModel.findById(newUser._id).exec();

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
