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
            // Create a new QueryRunner instance
            const queryRunner = this.jobRepository.manager.connection.createQueryRunner();

            // Start a transaction
            await queryRunner.startTransaction();

            try {
                  // Check if the job_Id already exists
                  const existingJob = await queryRunner.manager.findOne(Job, {
                        where: { jobId: jobData.job_Id },
                  });

                  // If the job_Id exists, return early and do not add any related data
                  if (existingJob) {
                        throw new Error(
                              `Job with job_Id ${jobData.job_Id} already exists. No data was added.`
                        );
                  }

                  // Find or create the company
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
                              name: jobData.district_name,
                        });
                        await queryRunner.manager.save(district); // Save the district to the database
                  }

                  let workLocation = await queryRunner.manager.findOne(WorkLocation, {
                        where: { district: { districtId: district.districtId } }, 
                  });

                  if (!workLocation) {
                        workLocation = queryRunner.manager.create(WorkLocation, {
                              workLocationId: jobData.job_Id,
                              address_name: jobData.work_location || 'Unknown',
                              districtId: district.districtId,
                              companyId: company.companyId,
                        });
                        await queryRunner.manager.save(workLocation);
                  }

                  // Check if the image with the same imageId already exists
                  const existingImage = await queryRunner.manager.findOne(ImageCompany, {
                        where: { company: jobData.companyId },
                  });
                  if (!existingImage) {
                        const imageCompany = queryRunner.manager.create(ImageCompany, {
                              company: jobData.companyId,
                              image: jobData.image,
                        });
                        await queryRunner.manager.save(imageCompany);
                  }

                  // Find related entities like industry, level, and type
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

                  // Check and create new RefJob if needed
                  let refJob = await queryRunner.manager.findOne(RefJob, {
                        where: { ref_job_Id: jobData.ref_job_Id },
                  });
                  if (!refJob) {
                        refJob = queryRunner.manager.create(RefJob, {
                              ref_job_Id: jobData.ref_job_Id,
                              ref_id: jobData.job_Id,
                              ref_url: jobData.ref_link,
                        });
                        await queryRunner.manager.save(refJob);
                  }

                  // Create job entity and set properties
                  const job = queryRunner.manager.create(Job, {
                        job_Id: jobData.job_Id,
                        title: jobData.title,
                        level: jobLevel,
                        type: jobType,
                        industry: jobIndustry,
                        workLocation: workLocation,
                        description: jobData.description,
                        requirement: jobData.requirement,
                        salary_from: jobData.salary_from,
                        salary_to: jobData.salary_to,
                        expire_on: jobData.expire_on,
                        refJob: refJob,
                        // benefits: jobData.benefits,
                        // benefits: "ádgashdg",
                        // work_time: jobData.work_time,
                        // work_time: "",
                        created_at: new Date(),
                        updated_at: new Date(),
                  });

                  // Assign company to the job
                  job.company = company;

                  // Save the job
                  await queryRunner.manager.save(job);

                  // Commit the transaction
                  await queryRunner.commitTransaction();

                  return job;
            } catch (error) {
                  // Rollback the transaction in case of an error
                  await queryRunner.rollbackTransaction();
                  throw error;
            } finally {
                  // Release the query runner after the transaction
                  await queryRunner.release();
            }
      }

      async getJobDetailsWithCompanyAndDistrict(): Promise<any[]> {
            try {
                  const jobs = await this.jobRepository.find({
                        relations: [
                              'job', 
                              
                        ],
                  });

                  return jobs;
            } catch (error) {
                  throw new Error(
                        `Failed to retrieve job data with related entities: ${error.message}`
                  );
            }
      }
}
