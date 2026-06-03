import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuration des fichiers statiques
  app.useStaticAssets(join(__dirname, '..', 'src', 'public'));
  app.useStaticAssets(join(__dirname, 'public'));

  // Configuration OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Orabank API')
    .setDescription("Documentation de l'API Orabank")
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Scalar UI
  app.use(
    '/api/docs',
    apiReference({
      spec: {
        content: document,
      },
      theme: 'purple', // themes: default, moon, purple, solarized, bluePlanet, saturn, kepler, mars, deepSpace
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
