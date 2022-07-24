import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ApplicationConfiguration } from './application.config';
import { ApplicationModule } from './application.module';

async function bootstrap() {
  const application = await NestFactory.create(ApplicationModule);

  const configService = application.get(ConfigService);

  application.enableCors({
    origin: configService.getOrThrow<
      ApplicationConfiguration['cors']['origin']
    >('application.cors.origin'),
  });

  const port =
    configService.getOrThrow<ApplicationConfiguration['port']>(
      'application.port',
    );

  await application.listen(port);
}

bootstrap();
