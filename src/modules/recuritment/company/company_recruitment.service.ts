import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recruitment } from '../../../entities/recruitment.entity';
import { ImageCompany } from '../../../entities/image_company.entity';
import { Company } from '../../../entities/company.entity';
import { CompanyIndustry } from '../../../entities/company_industry.entity';
import { WorkLocation } from '../../../entities/work_location.entity';
import { TaxCode } from '../../../entities/tax_code.entity';

@Injectable()
export class Recruitment_Company_Service {
        constructor(
                @InjectRepository(Recruitment)
                private recruitmentRepository: Repository<Recruitment>,
                @InjectRepository(ImageCompany)
                private imageCompanyRepository: Repository<ImageCompany>,
                @InjectRepository(Company)
                private companyRepository: Repository<Company>,
                @InjectRepository(TaxCode) // Explicitly inject TaxCode repository
                private taxCodeRepository: Repository<TaxCode>
        ) {}

        async getRecruitmentById(recruitmentId: number): Promise<any> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: [
                                'company',
                                'company.workLocations',
                                'company.workLocations.district',
                                'company.images',
                                'company.companyIndustries',
                                'company.taxCodes', // Added taxCodes relation
                        ],
                        select: {
                                recruitment_Id: true,
                                email_hr: true,
                                firstName: true,
                                lastName: true,
                                avatar_hr: true,
                                gender: true,
                                company: {
                                        companyId: true,
                                        name: true,
                                        created_at: true,
                                        updated_at: true,
                                        phoneNumber_company: true,
                                        companyIndustries: {
                                                companyIndustry_ID: true,
                                                name: true,
                                        },
                                        workLocations: {
                                                workLocationId: true,
                                                address_name: true,
                                                created_at: true,
                                                updated_at: true,
                                                district: {
                                                        districtId: true,
                                                        name: true,
                                                },
                                        },
                                        taxCodes: {
                                                taxCodeId: true,
                                                companyId: true,
                                                companyTaxIdentificationNumber: true,
                                                companySize: true,
                                                personalTaxCode: true,
                                                created_at: true,
                                        },
                                        images: {
                                                companyId: true,
                                                image_company: true,
                                                banner_BackgroundImage_company: true,
                                                Business_documents: true
                                        },
                                },
                        },
                });

                if (!recruitment) {
                        throw new NotFoundException('Recruitment not found');
                }

                return {
                        recruitment_Id: recruitment.recruitment_Id,
                        email_hr: recruitment.email_hr,
                        firstName: recruitment.firstName,
                        lastName: recruitment.lastName,
                        avatar_hr: recruitment.avatar_hr,
                        gender: recruitment.gender,
                        company: {
                                companyId: recruitment.company.companyId,
                                name: recruitment.company.name,
                                created_at: recruitment.company.created_at,
                                updated_at: recruitment.company.updated_at,
                                phoneNumber_company: recruitment.company.phoneNumber_company,
                                workLocations: recruitment.company.workLocations.map(
                                        (location) => ({
                                                workLocationId: location.workLocationId,
                                                address_name: location.address_name,
                                                created_at: location.created_at,
                                                updated_at: location.updated_at,
                                                district: {
                                                        districtId: location.district.districtId,
                                                        name: location.district.name,
                                                },
                                        })
                                ),
                                taxCodes: recruitment.company.taxCodes
                                        ? recruitment.company.taxCodes.map((taxCode) => ({
                                                  taxId: taxCode.taxCodeId, 
                                                  companyId: taxCode.companyId,
                                                  companyTaxIdentificationNumber:
                                                          taxCode.companyTaxIdentificationNumber,
                                                  companySize: taxCode.companySize,
                                                  personalTaxCode: taxCode.personalTaxCode,
                                                  created_at: taxCode.created_at,
                                          }))
                                        : null,
                                companyIndustries: recruitment.company.companyIndustries.map(
                                        (industry) => ({
                                                companyIndustry_ID: industry.companyIndustry_ID,
                                                name: industry.name,
                                        })
                                ),
                                images: recruitment.company.images
                                        ? recruitment.company.images.map((image) => ({
                                                  companyId: image.companyId,
                                                  image_company: image.image_company,
                                                  banner_BackgroundImage_company: image.banner_BackgroundImage_company,
                                                  Business_documents: image.Business_documents     
                                          }))
                                        : null,
                        },
                };
        }

        async getCompanyId(recruitmentId: number, companyId: number): Promise<any> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId, companyId },
                });

                if (!recruitment) {
                        throw new NotFoundException('Recruitment does not belong to this company');
                }

                const company = await this.companyRepository.findOne({
                        where: { companyId },
                        relations: [
                                'jobs',
                                'jobs.jobIndustry',
                                'jobs.jobType',
                                'jobs.jobLevel',
                                'jobs.workLocation',
                                'jobs.workLocation.district',
                                'jobs.generalInformation',
                                'jobs.refJob',
                                'workLocations',
                                'workLocations.district',
                                'companyIndustries',
                                'images',
                                'recruitmentEntity',
                                'taxCodes', // Added taxCodes relation
                        ],
                });

                if (!company) {
                        throw new NotFoundException('Company not found');
                }

                return {
                        company: {
                                companyId: company.companyId,
                                name: company.name,
                                created_at: company.created_at,
                                updated_at: company.updated_at,
                                phoneNumber_company: company.phoneNumber_company,
                                company_description: company.company_description,
                                workLocations: company.workLocations.map((location) => ({
                                        workLocationId: location.workLocationId,
                                        address_name: location.address_name,
                                        created_at: location.created_at,
                                        updated_at: location.updated_at,
                                        district: {
                                                districtId: location.district.districtId,
                                                name: location.district.name,
                                        },
                                })),
                                companyIndustries: company.companyIndustries.map((industry) => ({
                                        companyIndustry_ID: industry.companyIndustry_ID,
                                        name: industry.name,
                                })),
                                images: company.images
                                        ? company.images.map((image) => ({
                                                  companyId: image.companyId,
                                                  image_company: image.image_company,
                                                  banner_BackgroundImage_company:
                                                          image.banner_BackgroundImage_company,
                                                          Business_documents: image.Business_documents
                                          }))
                                        : null,
                                recruitment: company.recruitmentEntity
                                        ? {
                                                  recruitment_Id:
                                                          company.recruitmentEntity.recruitment_Id,
                                                  email_hr: company.recruitmentEntity.email_hr,
                                                  firstName: company.recruitmentEntity.firstName,
                                                  lastName: company.recruitmentEntity.lastName,
                                                  avatar_hr: company.recruitmentEntity.avatar_hr,
                                                  gender: company.recruitmentEntity.gender,
                                          }
                                        : null,

                                taxCodes: company.taxCodes
                                        ? company.taxCodes.map((taxCode) => ({
                                                  taxCodeId: taxCode.taxCodeId,
                                                  companyId: taxCode.companyId,
                                                  companyTaxIdentificationNumber:
                                                          taxCode.companyTaxIdentificationNumber,
                                                  companySize: taxCode.companySize,
                                                  personalTaxCode: taxCode.personalTaxCode,
                                                  created_at: taxCode.created_at,
                                          }))
                                        : null,
                                jobs: company.jobs.map((job) => ({
                                        jobId: job.jobId,
                                        title: job.title,
                                        jobLevel: {
                                                jobLevelId: job.jobLevel.jobLevelId,
                                                name: job.jobLevel.name,
                                        },
                                        jobType: {
                                                jobTypeId: job.jobType.jobTypeId,
                                                work_at: job.jobType.work_at,
                                                name: job.jobType.name,
                                        },
                                        jobIndustry: {
                                                jobIndustryId: job.jobIndustry.jobIndustryId,
                                                name: job.jobIndustry.name,
                                        },
                                        workLocation: {
                                                workLocationId: job.workLocation.workLocationId,
                                                address_name: job.workLocation.address_name,
                                                district: {
                                                        districtId: job.workLocation.district
                                                                .districtId,
                                                        name: job.workLocation.district.name,
                                                },
                                                created_at: job.workLocation.created_at,
                                                updated_at: job.workLocation.updated_at,
                                        },
                                        generalInformation: {
                                                general_Information_Id:
                                                        job.generalInformation
                                                                .general_Information_Id,
                                                numberOfRecruits:
                                                        job.generalInformation.numberOfRecruits,
                                                gender: job.generalInformation.gender,
                                        },
                                        salary_from: job.salary_from,
                                        salary_to: job.salary_to,
                                        expire_on: job.expire_on,
                                        description: job.description,
                                        requirement: job.requirement,
                                        benefits: job.benefits,
                                        refJob: job.refJob
                                                ? {
                                                          ref_job_Id: job.refJob.ref_job_Id,
                                                          ref_url: job.refJob.ref_url,
                                                          created_at: job.refJob.created_at,
                                                          updated_at: job.refJob.updated_at,
                                                  }
                                                : null,
                                        work_time: job.work_time,
                                        view: job.view,
                                        created_at: job.created_at,
                                        updated_at: job.updated_at,
                                })),
                        },
                };
        }

        async updateBannerBackground(
                recruitmentId: number,
                bannerUrl: string
        ): Promise<ImageCompany> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: ['company'],
                        select: {
                                recruitment_Id: true,
                                company: {
                                        companyId: true,
                                },
                        },
                });

                if (!recruitment || !recruitment.company) {
                        throw new NotFoundException('Recruitment or associated company not found');
                }

                const companyId = recruitment.company.companyId;

                let imageCompany = await this.imageCompanyRepository.findOne({
                        where: { companyId },
                });

                if (!imageCompany) {
                        imageCompany = this.imageCompanyRepository.create({
                                ImageCompanyId: companyId,
                                companyId,
                                banner_BackgroundImage_company: bannerUrl,
                                image_company: null,
                        });
                } else {
                        imageCompany.banner_BackgroundImage_company = bannerUrl;
                }

                return await this.imageCompanyRepository.save(imageCompany);
        }

        async updateCompanyLogo(recruitmentId: number, logoUrl: string): Promise<ImageCompany> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: ['company'],
                        select: {
                                recruitment_Id: true,
                                company: {
                                        companyId: true,
                                },
                        },
                });

                if (!recruitment || !recruitment.company) {
                        throw new NotFoundException('Recruitment or associated company not found');
                }

                const companyId = recruitment.company.companyId;

                let imageCompany = await this.imageCompanyRepository.findOne({
                        where: { companyId },
                });

                if (!imageCompany) {
                        imageCompany = this.imageCompanyRepository.create({
                                companyId,
                                image_company: logoUrl,
                                banner_BackgroundImage_company: null,
                        });
                } else {
                        imageCompany.image_company = logoUrl;
                }

                return await this.imageCompanyRepository.save(imageCompany);
        }

        async updateCompanyInfo(
                recruitmentId: number,
                updateData: {
                        name_company?: string;
                        phoneNumber_company?: string;
                        company_description?: string;
                        industries?: string[];
                        address_name?: string;
                        companyTaxIdentificationNumber?: string;
                        companySize?: string;
                        personalTaxCode?: string;
                }
        ): Promise<any> {
                console.log('Received updateData:', updateData);

                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: ['company'],
                });

                if (!recruitment || !recruitment.company) {
                        throw new NotFoundException('Recruitment or associated company not found');
                }

                const companyId = recruitment.company.companyId;

                const company = await this.companyRepository.findOne({
                        where: { companyId },
                        relations: [
                                'workLocations',
                                'workLocations.district',
                                'companyIndustries',
                                'images',
                                'recruitmentEntity',
                        ],
                });

                if (!company) {
                        throw new NotFoundException('Company not found');
                }

                if (updateData.name_company) company.name = updateData.name_company;
                if (updateData.phoneNumber_company)
                        company.phoneNumber_company = updateData.phoneNumber_company;
                if (updateData.company_description)
                        company.company_description = updateData.company_description;
                await this.companyRepository.save(company);

                if (updateData.industries) {
                        await this.companyRepository
                                .createQueryBuilder()
                                .relation(Company, 'companyIndustries')
                                .of(company)
                                .remove(company.companyIndustries);

                        const newIndustries = updateData.industries.map((industry) => {
                                const companyIndustry = new CompanyIndustry();
                                companyIndustry.companyIndustry_ID = companyId;
                                companyIndustry.name = industry;
                                companyIndustry.companyId = companyId;
                                return companyIndustry;
                        });

                        await this.companyRepository
                                .createQueryBuilder()
                                .relation(Company, 'companyIndustries')
                                .of(company)
                                .add(newIndustries);
                }

                if (updateData.address_name) {
                        let workLocation = company.workLocations[0];
                        if (!workLocation) {
                                workLocation = new WorkLocation();
                                workLocation.companyId = companyId;
                                workLocation.created_at = new Date();
                        }
                        workLocation.address_name = updateData.address_name;
                        workLocation.updated_at = new Date();
                        await this.companyRepository
                                .createQueryBuilder()
                                .relation(Company, 'workLocations')
                                .of(company)
                                .add(workLocation);
                }

                if (
                        updateData.companyTaxIdentificationNumber ||
                        updateData.companySize ||
                        updateData.personalTaxCode
                ) {
                        let taxCode = await this.taxCodeRepository.findOne({
                                where: { companyId },
                        });

                        if (!taxCode) {
                                taxCode = this.taxCodeRepository.create({
                                        taxCodeId: companyId,
                                        companyId,
                                        companyTaxIdentificationNumber:
                                                updateData.companyTaxIdentificationNumber || '',
                                        companySize: updateData.companySize || 'unknown',
                                        personalTaxCode: updateData.personalTaxCode || null,
                                        created_at: new Date(),
                                });
                        } else {
                                if (updateData.companyTaxIdentificationNumber)
                                        taxCode.companyTaxIdentificationNumber =
                                                updateData.companyTaxIdentificationNumber;
                                if (updateData.companySize)
                                        taxCode.companySize = updateData.companySize;
                                if (updateData.personalTaxCode)
                                        taxCode.personalTaxCode = updateData.personalTaxCode;
                        }

                        console.log('TaxCode to be saved:', taxCode);

                        await this.taxCodeRepository.save(taxCode);
                }

                const updatedCompany = await this.companyRepository.findOne({
                        where: { companyId },
                        relations: [
                                'workLocations',
                                'workLocations.district',
                                'companyIndustries',
                                'images',
                                'recruitmentEntity',
                        ],
                });

                return {
                        companyId: updatedCompany.companyId,
                        name: updatedCompany.name,
                        created_at: updatedCompany.created_at,
                        updated_at: updatedCompany.updated_at,
                        phoneNumber_company: updatedCompany.phoneNumber_company,
                        company_description: updatedCompany.company_description,
                        workLocations: updatedCompany.workLocations.map((location) => ({
                                workLocationId: location.workLocationId,
                                address_name: location.address_name,
                                created_at: location.created_at,
                                updated_at: location.updated_at,
                                district: location.district
                                        ? {
                                                  districtId: location.district.districtId,
                                                  name: location.district.name,
                                          }
                                        : null,
                        })),
                        companyIndustries: updatedCompany.companyIndustries.map((industry) => ({
                                companyIndustry_ID: industry.companyIndustry_ID,
                                name: industry.name,
                        })),
                        images: updatedCompany.images
                                ? updatedCompany.images.map((image) => ({
                                          companyId: image.companyId,
                                          image_company: image.image_company,
                                          banner_BackgroundImage_company:
                                                  image.banner_BackgroundImage_company,
                                  }))
                                : null,
                        recruitment: updatedCompany.recruitmentEntity
                                ? {
                                          recruitment_Id:
                                                  updatedCompany.recruitmentEntity.recruitment_Id,
                                          email_hr: updatedCompany.recruitmentEntity.email_hr,
                                          firstName: updatedCompany.recruitmentEntity.firstName,
                                          lastName: updatedCompany.recruitmentEntity.lastName,
                                          avatar_hr: updatedCompany.recruitmentEntity.avatar_hr,
                                          gender: updatedCompany.recruitmentEntity.gender,
                                  }
                                : null,
                };
        }
}
