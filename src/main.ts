// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
        const app = await NestFactory.create<NestExpressApplication>(AppModule);

        // Ensure upload directories exist
        const bannerUploadDir = './Uploads/companyBanners';
        const logoUploadDir = './Uploads/companyLogos'; // New directory for logos
        if (!fs.existsSync(bannerUploadDir)) {
                fs.mkdirSync(bannerUploadDir, { recursive: true });
        }
        if (!fs.existsSync(logoUploadDir)) {
                fs.mkdirSync(logoUploadDir, { recursive: true });
        }

        // Get configuration from ConfigService
        const configService = app.get(ConfigService);
        const port = configService.get<number>('PORT') || 5000;

        // Configure CORS
        app.enableCors({
                origin: ['http://localhost:3000', 'http://localhost:4000'], // Allow frontend access
                credentials: true, // Allow cookies
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed methods
                allowedHeaders: 'Content-Type, Authorization', // Allowed headers
        });

        // Configure static file serving from 'Uploads' directory
        app.useStaticAssets(join(__dirname, '..', 'Uploads'), {
                prefix: '/uploads',
        });

        // Increase request size limit to 10MB
        app.use(bodyParser.json({ limit: '10mb' }));
        app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

        // Listen on configured port
        await app.listen(port);
        console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
