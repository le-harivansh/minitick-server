import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { verify } from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { User, UserDocument, UserSchema } from '../src/user/schema/user.schema';
import { UserService } from '../src/user/user.service';

describe('UserService (e2e)', () => {
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
              return {
                'authentication.jwt.refreshToken.duration': '15 minutes',
              }[key];
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

  describe('create', () => {
    it("saves the provided user's data to the database", async () => {
      const userData: User = {
        username: 'le-user',
        password: 'nope.jpeg',
      };

      await userService.create(userData);

      const retrievedUser = await userModel.findOne(userData).exec();

      expect(retrievedUser).toMatchObject(userData);
    });
  });

  describe('findByUsername', () => {
    const userData: User = {
      username: 'one',
      password: 'oneone',
    };

    beforeAll(async () => {
      await userModel.create(userData);
    });

    it('returns the corresponding user from the database', async () => {
      expect(
        userService.findByUsername(userData.username),
      ).resolves.toMatchObject(userData);
    });

    it('returns undefined if the user could not be found in the database', async () => {
      expect(userService.findByUsername('non-existant-user')).resolves
        .toBeUndefined;
    });
  });

  describe('saveRefreshToken', () => {
    it("saves a hash of the refresh token to the user's refresh-token array", async () => {
      const userData: User = {
        username: 'zero',
        password: 'zero',
      };

      await userModel.create(userData);

      const plainRefreshToken = 'refresh-token';

      await userService.saveRefreshToken(userData.username, plainRefreshToken);

      const retrievedUser = await userModel.findOne(userData).exec();
      const { hash: hashedRefreshToken } = retrievedUser.hashedRefreshTokens[0];

      expect(
        verify(hashedRefreshToken, plainRefreshToken),
      ).resolves.toBeTruthy();
    });

    it("prunes a user's stale tokens", async () => {
      const userData: User = {
        username: 'username-01',
        password: 'le-password',
        hashedRefreshTokens: [
          {
            hash: 'expired-token',
            expiresOn: new Date(Date.now() - 1000 * 60 * 60),
          },
          {
            hash: 'another-expired-token',
            expiresOn: new Date(Date.now() - 1000 * 10 * 60),
          },
          {
            hash: 'valid-token',
            expiresOn: new Date(Date.now() + 1000 * 15 * 60),
          },
        ],
      };

      const newUser = await userModel.create(userData);

      expect(newUser.hashedRefreshTokens).toHaveLength(3);

      const newToken = 'new-token';

      await userService.saveRefreshToken(userData.username, 'new-token');

      const retrievedUser = await userModel
        .findOne({ username: userData.username })
        .exec();

      expect(retrievedUser.hashedRefreshTokens).toHaveLength(2);
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
          newToken,
        ),
      ).resolves.toBeTruthy();
    });
  });
});
