import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './recruitment_auth.service';
import { AuthController } from './recruitment_auth.controller';
import { Recruitment } from '../../../../entities/recruitment.entity';
import { Company } from '../../../../entities/company.entity';
import { JobIndustry } from '../../../../entities/job_industry.entity';
import { WorkLocation } from '../../../../entities/work_location.entity';
import { District } from '../../../../entities/district.entity';
import { User } from '../../../../entities/user.entity'; 

@Module({
        imports: [
                TypeOrmModule.forFeature([
                        Recruitment,
                        Company,
                        JobIndustry,
                        WorkLocation,
                        District,
                        User, 
                ]),
        ],
        controllers: [AuthController],
        providers: [AuthService],
        exports: [AuthService],
})
export class AuthReCuitmentRegister_Module {}
