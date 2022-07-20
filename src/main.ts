import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ApplicationConfig } from './application.config';
import { ApplicationModule } from './application.module';

async function bootstrap() {
  const application = await NestFactory.create(ApplicationModule);

  const configService = application.get(ConfigService);

  application.enableCors({
    origin: configService.getOrThrow<ApplicationConfig['corsOrigin']>(
      'application.corsOrigin',
    ),
  });

  const port =
    configService.getOrThrow<ApplicationConfig['port']>('application.port');

  await application.listen(port);
}

bootstrap();
