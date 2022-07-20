import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import databaseConfig, { DatabaseConfig } from './database.config';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { host, port, name }: DatabaseConfig = {
          host: configService.getOrThrow('database.host'),
          port: configService.getOrThrow('database.port'),
          name: configService.getOrThrow('database.name'),
        };

        return {
          uri: `mongodb://${host}:${port}/${name}`,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
