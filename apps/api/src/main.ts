import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for mobile and Next.js applications
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Use global validation pipes for input checks
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Brick Food Pro API is running on: http://localhost:${port}/api`);
}
bootstrap();
