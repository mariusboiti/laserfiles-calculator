import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppGlobals } from './app.globals';
import { OffcutsService } from './offcuts/offcuts.service';
import { SalesChannelsConnectionsService } from './sales-channels/sales-channels.connections.service';

async function bootstrap() {
  dotenv.config({ path: join(__dirname, '..', '.env') });
  console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Initialize global service references for controllers that cannot rely on normal DI
  try {
    AppGlobals.offcutsService = app.get(OffcutsService, { strict: false });
    AppGlobals.salesChannelsConnectionsService = app.get(SalesChannelsConnectionsService, {
      strict: false,
    });
  } catch (err) {
    console.error('Failed to initialize AppGlobals services', err);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: [/http:\/\/localhost:\d+$/],
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const config = new DocumentBuilder()
    .setTitle('Laser Workshop API')
    .setDescription('API for craft laser workshop management')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  try {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  } catch (error) {
    console.error('Failed to set up Swagger docs', error);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
}

bootstrap();
