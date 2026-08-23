import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const helmetMiddleware = helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  });
  app.use((req, res, next) => {
    if (req.headers.accept === 'text/event-stream') return next();
    helmetMiddleware(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Configuration des fichiers statiques
  // Sert tout le contenu du dossier public (css, js, assets, etc.)
  app.useStaticAssets(join(__dirname, '..', 'src', 'public'));
  app.useStaticAssets(join(__dirname, 'public'));
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Configuration OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Orabank API')
    .setDescription("Documentation de l'API Orabank")
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  try {
    const document = SwaggerModule.createDocument(app, config);

    if (process.env.NODE_ENV !== 'production') {
      app.use(
        '/api/docs',
        apiReference({
          spec: {
            content: document,
          },
          theme: 'purple',
        }),
      );
    }
  } catch (e) {
    console.warn('⚠ Swagger disabled (circular DTO):', e.message);
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
