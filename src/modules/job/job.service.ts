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
                  // Kiểm tra job_Id đã tồn tại hay chưa
                  const existingJob = await queryRunner.manager.findOne(Job, {
                        where: { jobId: jobData.job_Id },
                  });

                  if (existingJob) {
                        // Nếu jobId đã tồn tại, không lưu job và trả về thông báo lỗi
                        throw new Error(`Job with job_Id ${jobData.job_Id} already exists.`);
                  }

                  // Thực hiện lưu thông tin công ty
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

                  // Thực hiện lưu thông tin district
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

                  // Thực hiện lưu thông tin WorkLocation
                  let workLocation = await queryRunner.manager.findOne(WorkLocation, {
                        where: { district: { districtId: district.districtId } },
                        relations: ['district'],
                  });

                  if (!workLocation) {
                        workLocation = queryRunner.manager.create(WorkLocation, {
                              workLocationId: jobData.job_Id,
                              address_name: jobData.address_name || 'Unknown',
                              district: district,
                              company: company,
                        });
                        await queryRunner.manager.save(workLocation);
                  }

                  let generalInformation = await queryRunner.manager.findOne(GeneralInformation, {
                        where: { general_Information_Id: jobData.job_Id },
                  });

                  if (!generalInformation) {
                        // Create a new record if it doesn't exist
                        generalInformation = queryRunner.manager.create(GeneralInformation, {
                              general_Information_Id: jobData.job_Id,
                              numberOfRecruits: 0,
                              gender: 'no pairing',
                              experience: jobData.experience,
                              tech_stack: jobData.tech_stack,
                        });
                        await queryRunner.manager.save(generalInformation);
                  } else {
                        // If it exists, you can update the existing record if needed
                        generalInformation.numberOfRecruits = 0; // or any other update logic you need
                        generalInformation.gender = 'no pairing'; // update gender if needed
                        await queryRunner.manager.save(generalInformation); // update the record
                  }

                  // Lưu ImageCompany nếu chưa tồn tại
                  const existingImage = await queryRunner.manager.findOne(ImageCompany, {
                        where: { company: { companyId: jobData.companyId } },
                  });

                  if (!existingImage) {
                        const imageCompany = queryRunner.manager.create(ImageCompany, {
                              ImageCompanyId: jobData.job_Id,
                              company: company,
                              image_company: jobData.image,
                        });
                        await queryRunner.manager.save(imageCompany);
                  }

                  // Lấy thông tin jobIndustry, jobLevel, jobType nếu tồn tại
                  let jobIndustry = await queryRunner.manager.findOne(JobIndustry, {
                        where: { jobIndustryId: jobData.job_Id },
                  });

                  if (!jobIndustry) {
                        jobIndustry = queryRunner.manager.create(JobIndustry, {
                              jobIndustryId: jobData.job_Id,
                              name: jobData.job_industry,
                        });
                        await queryRunner.manager.save(jobIndustry);
                  }

                  let jobLevel = await queryRunner.manager.findOne(JobLevel, {
                        where: { jobLevelId: jobData.job_Id },
                  });

                  if (!jobLevel) {
                        jobLevel = queryRunner.manager.create(JobLevel, {
                              jobLevelId: jobData.job_Id,
                              name: jobData.job_level,
                        });
                        await queryRunner.manager.save(jobLevel);
                  }

                  let jobType = await queryRunner.manager.findOne(JobType, {
                        where: { jobTypeId: jobData.job_Id },
                  });

                  if (!jobType) {
                        jobType = queryRunner.manager.create(JobType, {
                              jobTypeId: jobData.job_Id,
                              work_at: jobData.work_at,
                              name: jobData.job_type,
                        });
                        await queryRunner.manager.save(jobType);
                  }

                  // Lưu RefJob nếu chưa tồn tại
                  let refJob = await queryRunner.manager.findOne(RefJob, {
                        where: { ref_job_Id: jobData.job_Id },
                  });

                  if (!refJob) {
                        refJob = queryRunner.manager.create(RefJob, {
                              ref_job_Id: jobData.job_Id,
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
                        salary: jobData.salary,
                        benefits: jobData.benefit,
                        work_time: 'undetermined',
                        generalInformation: generalInformation,
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

      async getJAllJobs(): Promise<Job[]> {
            try {
                  return await this.jobRepository.find({
                        relations: [
                              'workLocation',
                              'workLocation.district',
                              'company',
                              'refJob',
                              'company.images',
                              'jobType',
                              'jobLevel',
                              'jobIndustry',
                              'generalInformation',
                        ],
                  });
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }

      async getJobById(jobId: number): Promise<Job | null> {
            try {
                  const job = await this.jobRepository.findOne({
                        where: { jobId },
                        relations: [
                              'workLocation',
                              'workLocation.district',
                              'company',
                              'refJob',
                              'company.images',
                              'jobType',
                              'jobLevel',
                              'jobIndustry',
                              'generalInformation',
                        ],
                  });

                  if (!job) {
                        throw new Error('Job not found');
                  }

                  return job;
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }

      async getJobsByTech(tech: string): Promise<Job[]> {
            try {
                // Use QueryBuilder for more complex queries
                const jobs = await this.jobRepository
                    .createQueryBuilder('job')
                    .leftJoinAndSelect('job.workLocation', 'workLocation')
                    .leftJoinAndSelect('workLocation.district', 'district')
                    .leftJoinAndSelect('job.company', 'company')
                    .leftJoinAndSelect('company.images', 'images')
                    .leftJoinAndSelect('job.refJob', 'refJob')
                    .leftJoinAndSelect('job.jobType', 'jobType')
                    .leftJoinAndSelect('job.jobLevel', 'jobLevel')
                    .leftJoinAndSelect('job.jobIndustry', 'jobIndustry')
                    .leftJoinAndSelect('job.generalInformation', 'generalInformation')
                    .where('generalInformation.tech_stack LIKE :tech', { tech: `%${tech}%` })
                    .getMany();
        
                return jobs;
            } catch (error) {
                throw new Error(`Error retrieving jobs by tech: ${error.message}`);
            }
        }
        
}
