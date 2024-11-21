import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobController } from '../job/job.controller'; 
import { JobService } from './job.service';  
import { Job } from '../../entities/job.entity';  // Import Job entity
import { Company } from '../../entities/company.entity';
import { ImageCompany } from '../../entities/image_company.entity';
import { JobIndustry } from '../../entities/job_industry.entity';
import { JobLevel } from '../../entities/job_level.entity';
import { JobType } from '../../entities/job_type.entity';
import { WorkLocation } from '../../entities/work_location.entity';
import { RefJob } from '../../entities/ref_job.entity';
import { GeneralInformation } from '../../entities/general_information.entity';  
import { District } from '../../entities/district.entity';  


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Company,
      ImageCompany,
      JobIndustry,
      JobLevel,
      JobType,
      WorkLocation,
      RefJob,
      District,
      GeneralInformation,
    ]),
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService], 
})
export class JobModule {}

