import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recruitment_CompanyController } from './company_recruitment.controller';
import { Recruitment_Company_Service } from './company_recruitment.service';
import { Recruitment } from '../../../entities/recruitment.entity';
import { Company } from '../../../entities/company.entity';
import { ImageCompany } from '../../../entities/image_company.entity';
@Module({
        imports: [TypeOrmModule.forFeature([Recruitment, Company, ImageCompany])],
        controllers: [Recruitment_CompanyController],
        providers: [Recruitment_Company_Service],
        exports: [Recruitment_Company_Service],
})
export class RecruitmentCompany_Module {}
