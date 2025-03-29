import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Lấy cấu hình từ ConfigService
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;

  // Cấu hình CORS
  app.enableCors({
    origin: ['http://localhost:3000'], // Cho phép frontend truy cập
    credentials: true, // Cho phép gửi từ Cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Các phương thức được phép
    allowedHeaders: 'Content-Type, Authorization', // Các headers cho phép
  });

  // Cấu hình phục vụ tệp tĩnh từ thư mục 'uploads'
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads', 
  });

  // Tăng giới hạn kích thước request lên 10MB
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Lắng nghe trên cổng đã cấu hình
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
