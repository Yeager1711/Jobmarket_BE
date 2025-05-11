import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recruitment_CompanyController } from './company_recruitment.controller';
import { Recruitment_Company_Service } from './company_recruitment.service';
import { Recruitment } from '../../../entities/recruitment.entity';
import { Company } from '../../../entities/company.entity';
import { ImageCompany } from '../../../entities/image_company.entity';
import { JobIndustry } from 'src/entities/job_industry.entity';
import { CompanyIndustry } from '../../../entities/company_industry.entity'; // Add this import
import { WorkLocation } from '../../../entities/work_location.entity'; // Add this import
import { TaxCode } from '../../../entities/tax_code.entity'; // Add this import

@Module({
        imports: [
                TypeOrmModule.forFeature([
                        Recruitment,
                        Company,
                        ImageCompany,
                        JobIndustry,
                        CompanyIndustry, // Add this
                        WorkLocation, // Add this
                        TaxCode, // Add this
                ]),
        ],
        controllers: [Recruitment_CompanyController],
        providers: [Recruitment_Company_Service],
        exports: [Recruitment_Company_Service],
})
export class RecruitmentCompany_Module {}
