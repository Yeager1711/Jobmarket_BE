import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobController } from './modules/job/job.controller';
import { JobService } from './modules/job/job.service';

// Import entities
import { Company } from './entities/company.entity';
import { District } from './entities/district.entity';
import { ImageCompany } from './entities/image_company.entity';
import { JobIndustry } from './entities/job_industry.entity';
import { JobLevel } from './entities/job_level.entity';
import { JobType } from './entities/job_type.entity';
import { Job } from './entities/job.entity';
import { RefJob } from './entities/ref_job.entity';
import { WorkLocation } from './entities/work_location.entity';
import { GeneralInformation } from './entities/general_information.entity';

// Import modules
import { JobModule } from './modules/job/job.module';

// Log environment variables to check if they are loaded correctly
console.log('DB Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jobmarket',
      entities: [__dirname + '/**/*.entity{.ts,.js}'], 
      synchronize: false,
    }),
    JobModule, // Chỉ cần import JobModule
  ],
})
export class AppModule {}
