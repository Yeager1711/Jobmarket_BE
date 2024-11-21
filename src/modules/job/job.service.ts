import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Company } from '../../entities/company.entity';
import { ImageCompany } from '../../entities/image_company.entity';
import { JobIndustry } from '../../entities/job_industry.entity';
import { JobLevel } from '../../entities/job_level.entity';
import { JobType } from '../../entities/job_type.entity';
import { WorkLocation } from '../../entities/work_location.entity';
import { RefJob } from '../../entities/ref_job.entity';
import { GeneralInformation } from '../../entities/general_information.entity';
import { District } from '../../entities/district.entity';

@Injectable()
export class JobService {
      constructor(
            @InjectRepository(Job)
            private readonly jobRepository: Repository<Job>,

            @InjectRepository(Company)
            private readonly companyRepository: Repository<Company>,

            @InjectRepository(ImageCompany)
            private readonly imageCompanyRepository: Repository<ImageCompany>,

            @InjectRepository(JobIndustry)
            private readonly jobIndustryRepository: Repository<JobIndustry>,

            @InjectRepository(JobLevel)
            private readonly jobLevelRepository: Repository<JobLevel>,

            @InjectRepository(JobType)
            private readonly jobTypeRepository: Repository<JobType>,

            @InjectRepository(WorkLocation)
            private readonly workLocationRepository: Repository<WorkLocation>,

            @InjectRepository(RefJob)
            private readonly refJobRepository: Repository<RefJob>,

            @InjectRepository(District)
            private readonly districtRepository: Repository<District>,

            @InjectRepository(GeneralInformation)
            private readonly generalInformationRepository: Repository<GeneralInformation>
      ) {}

      generateRandomRefId(baseNumber: number): number {
            const randomNumber = Math.floor(Math.random() * 10000);
            return baseNumber * 10000 + randomNumber;
      }

      async saveJobData(jobData: any): Promise<Job> {
            if (!jobData.company_name) {
                  throw new Error('Invalid input: company_name is missing');
            }

            const queryRunner = this.jobRepository.manager.connection.createQueryRunner();
            await queryRunner.startTransaction();

            try {
                  const existingJob = await queryRunner.manager.findOne(Job, {
                        where: { jobId: jobData.job_Id },
                  });

                  if (existingJob) {
                        throw new Error(`Job with job_Id ${jobData.job_Id} already exists.`);
                  }

                  let company = await queryRunner.manager.findOne(Company, {
                        where: { name: jobData.company_name },
                    });                    

                  if (!company) {
                        company = queryRunner.manager.create(Company, {
                              companyId: jobData.job_Id,
                              name: jobData.company_name,
                        });
                        await queryRunner.manager.save(company);
                  }

                  let district = await queryRunner.manager.findOne(District, {
                        where: { name: jobData.district_name },
                  });

                  if (!district) {
                        district = queryRunner.manager.create(District, {
                              districtId: jobData.job_Id,
                              name: jobData.district_name,
                        });
                        await queryRunner.manager.save(district);
                  }

                  let workLocation = await queryRunner.manager.findOne(WorkLocation, {
                        where: { district: { districtId: district.districtId } },
                        relations: ['district'],
                  });

                  if (!workLocation) {
                        workLocation = queryRunner.manager.create(WorkLocation, {
                              workLocationId: jobData.job_Id,
                              address_name: jobData.work_location || 'Unknown',
                              district: district,
                              company: company,
                        });
                        await queryRunner.manager.save(workLocation);
                  }

                  // Check if the image with the same imageId already exists
                  const existingImage = await queryRunner.manager.findOne(ImageCompany, {
                        where: { company: { companyId: jobData.companyId } },
                  });
                  if (!existingImage) {
                        const imageCompany = queryRunner.manager.create(ImageCompany, {
                              ImageCompanyId: jobData.companyId,
                              company: jobData.companyId,
                              image_company: jobData.image,
                        });
                        await queryRunner.manager.save(imageCompany);
                  }
                  const jobIndustry =
                        (await queryRunner.manager.findOne(JobIndustry, {
                              where: { name: jobData.industry },
                        })) || null;

                  const jobLevel =
                        (await queryRunner.manager.findOne(JobLevel, {
                              where: { name: jobData.level },
                        })) || null;

                  const jobType =
                        (await queryRunner.manager.findOne(JobType, {
                              where: { name: jobData.type },
                        })) || null;

                  let refJob = await queryRunner.manager.findOne(RefJob, {
                        where: { ref_job_Id: jobData.ref_job_Id },
                  });

                  if (!refJob) {
                        refJob = queryRunner.manager.create(RefJob, {
                              ref_job_Id: jobData.ref_job_Id,
                              ref_url: jobData.ref_link,
                        });
                        await queryRunner.manager.save(refJob);
                  }

                  const job = queryRunner.manager.create(Job, {
                        jobId: jobData.job_Id,
                        title: jobData.title,
                        jobLevel: jobLevel,
                        jobType: jobType,
                        jobIndustry: jobIndustry,
                        workLocation: workLocation,
                        description: jobData.description,
                        requirement: jobData.requirement,
                        salary_from: jobData.salary_from,
                        salary_to: jobData.salary_to,
                        // expire_on: jobData.expire_on,
                        expire_on: '31/12/2024',
                        refJob: refJob,
                        created_at: new Date(),
                        updated_at: new Date(),
                  });

                  job.company = company;

                  await queryRunner.manager.save(job);
                  await queryRunner.commitTransaction();

                  return job;
            } catch (error) {
                  await queryRunner.rollbackTransaction();
                  throw error;
            } finally {
                  await queryRunner.release();
            }
      }
}