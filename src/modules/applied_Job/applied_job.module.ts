import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppliedJobService } from './applied_job.service';
import { AppliedJobController } from './applied_job.controller';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job_application.entity';
import { ResumeCV } from '../../entities/resumecv.entity';
import { AuthModule } from '../auth/register/auth.module';
import { UserModule } from '../auth/user/user.module'; // Import UserModule

@Module({
        imports: [
                TypeOrmModule.forFeature([User, Job, JobApplication, ResumeCV]),
                AuthModule,
                UserModule, 
        ],
        controllers: [AppliedJobController],
        providers: [AppliedJobService],
})
export class AppliedJobModule {}
