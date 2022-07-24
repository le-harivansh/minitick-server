import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import databaseConfiguration, {
  DatabaseConfiguration,
} from './database.config';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfiguration),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { host, port, name }: DatabaseConfiguration = {
          host: configService.getOrThrow<DatabaseConfiguration['host']>(
            'database.host',
          ),
          port: configService.getOrThrow<DatabaseConfiguration['port']>(
            'database.port',
          ),
          name: configService.getOrThrow<DatabaseConfiguration['name']>(
            'database.name',
          ),
        };

        return {
          uri: `mongodb://${host}:${port}/${name}`,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
