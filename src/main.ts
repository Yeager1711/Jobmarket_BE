import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lấy cấu hình từ ConfigService
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;

  // Cấu hình CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Cho phép yêu cầu từ frontend (frontend đang chạy ở http://localhost:3000)
    methods: 'GET, POST, PUT, DELETE', // Các phương thức được phép
    allowedHeaders: 'Content-Type, Authorization', // Các headers cho phép
  });

  // Lắng nghe trên cổng đã cấu hình
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
