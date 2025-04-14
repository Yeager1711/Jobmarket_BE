// company_recruitment.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recruitment } from '../../../entities/recruitment.entity';
import { ImageCompany } from '../../../entities/image_company.entity';

@Injectable()
export class Recruitment_Company_Service {
        constructor(
                @InjectRepository(Recruitment)
                private recruitmentRepository: Repository<Recruitment>,
                @InjectRepository(ImageCompany)
                private imageCompanyRepository: Repository<ImageCompany>
        ) {}

        async getRecruitmentById(recruitmentId: number): Promise<any> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: [
                                'company',
                                'company.jobs',
                                'company.jobs.jobIndustry',
                                'company.workLocations',
                                'company.workLocations.district',
                                'company.images',
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
                                        jobs: {
                                                jobId: true,
                                                title: true,
                                                jobIndustry: {
                                                        jobIndustryId: true,
                                                        name: true,
                                                },
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
                                        images: {
                                                companyId: true,
                                                image_company: true,
                                                banner_BackgroundImage_company: true, // Added field
                                        },
                                },
                        },
                });

                if (!recruitment) {
                        throw new NotFoundException('Recruitment not found');
                }

                const industries = [
                        ...new Map(
                                recruitment.company.jobs.map((job) => [
                                        job.jobIndustry.jobIndustryId,
                                        {
                                                jobIndustryId: job.jobIndustry.jobIndustryId,
                                                name: job.jobIndustry.name,
                                        },
                                ])
                        ).values(),
                ];

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
                                images: recruitment.company.images
                                        ? recruitment.company.images.map((image) => ({
                                                  companyId: image.companyId,
                                                  image_company: image.image_company,
                                                  banner_BackgroundImage_company:
                                                          image.banner_BackgroundImage_company,
                                          }))
                                        : null,
                        },
                };
        }

        async updateBannerBackground(
                recruitmentId: number,
                bannerUrl: string
        ): Promise<ImageCompany> {
                // Fetch recruitment to get companyId
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

                // Check if image_company record exists
                let imageCompany = await this.imageCompanyRepository.findOne({
                        where: { companyId },
                });

                if (!imageCompany) {
                        // Create new record if none exists
                        imageCompany = this.imageCompanyRepository.create({
                                ImageCompanyId: companyId,
                                companyId,
                                banner_BackgroundImage_company: bannerUrl,
                                image_company: null, // Default or existing value
                        });
                } else {
                        // Update existing record
                        imageCompany.banner_BackgroundImage_company = bannerUrl;
                }

                // Save the updated or new record
                return await this.imageCompanyRepository.save(imageCompany);
        }

        // logo update
        async updateCompanyLogo(recruitmentId: number, logoUrl: string): Promise<ImageCompany> {
                // Fetch recruitment to get companyId
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

                // Check if image_company record exists
                let imageCompany = await this.imageCompanyRepository.findOne({
                        where: { companyId },
                });

                if (!imageCompany) {
                        // Create new record if none exists
                        imageCompany = this.imageCompanyRepository.create({
                                companyId,
                                image_company: logoUrl,
                                banner_BackgroundImage_company: null, // Default or existing value
                        });
                } else {
                        // Update existing record
                        imageCompany.image_company = logoUrl;
                }

                // Save the updated or new record
                return await this.imageCompanyRepository.save(imageCompany);
        }
}
