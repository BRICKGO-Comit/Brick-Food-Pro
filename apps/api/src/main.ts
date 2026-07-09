import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
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

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

// Local development fallback
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  bootstrap().then(server => {
    server.listen(port, () => {
      console.log(`Brick Food Pro API is running on: http://localhost:${port}/api`);
    });
  });
}

// Export for Vercel Serverless Function
export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};
