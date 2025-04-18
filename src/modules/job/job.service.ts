import { Injectable, Logger } from '@nestjs/common';
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
import { Recruitment } from 'src/entities/recruitment.entity';

import { sortExperience } from './ultis/sort/sortExperience';
import { WinstonLoggerService } from '../../common/logger';

@Injectable()
export class JobService {
        private readonly loggerNest = new Logger(JobService.name); // Logger mặc định của NestJS
        private readonly loggerWinston = new WinstonLoggerService(); // Logger custom Winston

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
                private readonly generalInformationRepository: Repository<GeneralInformation>,

                @InjectRepository(Recruitment)
                private readonly recruitmentResponsitory: Repository<Recruitment>
        ) {}

        async saveJobData(jobData: any): Promise<Job> {
                if (!jobData.company_name) {
                        this.loggerWinston.error(
                                `Invalid input: company_name is missing for jobId: ${jobData.job_Id}`
                        );
                        throw new Error('Invalid input: company_name is missing');
                }

                const queryRunner = this.jobRepository.manager.connection.createQueryRunner();
                await queryRunner.startTransaction();

                try {
                        this.loggerWinston.log(`Processing job data for job_Id: ${jobData.job_Id}`);
                        // Kiểm tra job_Id đã tồn tại hay chưa
                        const existingJob = await queryRunner.manager.findOne(Job, {
                                where: { jobId: jobData.job_Id },
                        });

                        if (existingJob) {
                                // Nếu jobId đã tồn tại, không lưu job và trả về thông báo lỗi
                                this.loggerWinston.warn(
                                        `Job with job_Id ${jobData.job_Id} already exists.`
                                );
                                throw new Error(
                                        `Job with job_Id ${jobData.job_Id} already exists.`
                                );
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
                                this.loggerWinston.info(
                                        `Company ${jobData.company_name} created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `District ${jobData.district_name} created for jobId: ${jobData.job_Id}`
                                );
                        }

                        let generalInformation = await queryRunner.manager.findOne(
                                GeneralInformation,
                                {
                                        where: { general_Information_Id: jobData.job_Id },
                                }
                        );

                        if (!generalInformation) {
                                // Create a new record if it doesn't exist
                                generalInformation = queryRunner.manager.create(
                                        GeneralInformation,
                                        {
                                                general_Information_Id: jobData.job_Id,
                                                numberOfRecruits: 0,
                                                gender: 'no pairing',
                                                experience: jobData.experience,
                                                tech_stack: jobData.tech_stack,
                                        }
                                );
                                await queryRunner.manager.save(generalInformation);
                        } else {
                                // If it exists, you can update the existing record if needed
                                generalInformation.numberOfRecruits = 0; // or any other update logic you need
                                generalInformation.gender = 'no pairing'; // update gender if needed
                                await queryRunner.manager.save(generalInformation); // update the record
                                this.loggerWinston.info(
                                        `GeneralInformation created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `ImageCompany created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `JobIndustry created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `JobLevel created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `JobType created for jobId: ${jobData.job_Id}`
                                );
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
                                this.loggerWinston.info(
                                        `RefJob created for jobId: ${jobData.job_Id}`
                                );
                        }

                        const job = queryRunner.manager.create(Job, {
                                jobId: jobData.job_Id,
                                title: jobData.title,
                                jobLevel: jobLevel,
                                jobType: jobType,
                                jobIndustry: jobIndustry,
                                // workLocation: workLocation,
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
                                //view: 0,
                                Hot_Job: jobData.Hot_Job || 'Null',
                                created_at: new Date(),
                                updated_at: new Date(),
                        });

                        job.company = company;

                        await queryRunner.manager.save(job);
                        await queryRunner.commitTransaction();
                        this.loggerWinston.info(
                                `Job data saved successfully for jobId: ${jobData.job_Id}`
                        );

                        return job;
                } catch (error) {
                        await queryRunner.rollbackTransaction();
                        this.loggerWinston.error(
                                `Error processing jobId: ${jobData.job_Id}, error: ${error.message}`,
                                error.stack
                        );
                        throw error;
                } finally {
                        await queryRunner.release();
                }
        }

        async getAllJobs(): Promise<Job[]> {
                try {
                        this.loggerWinston.log('Fetching all jobs with relations');
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
                        this.loggerWinston.error(
                                `Error retrieving job details: ${error.message}`,
                                error.stack
                        );
                        throw new Error(`Error retrieving job details: ${error.message}`);
                }
        }

        async getAllJobs_Types(): Promise<{
                category: {
                        jobLevels: string[];
                        jobIndustries: string[];
                        TechStack: string[];
                        Experience: string[];
                        jobTypesWorkAt: string[];
                        jobTypesName: string[];
                        jobDistrict: string[];
                        jobDistrict_encode: string[];
                };
                jobs: Job[];
        }> {
                try {
                        const jobs = await this.jobRepository.find({
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

                        const jobIndustriesSet = new Set<string>();
                        const techStackSet = new Set<string>();
                        const jobLevelsSet = new Set<string>();
                        const jobExperienceSet = new Set<string>();
                        const jobTypesWorkAtSet = new Set<string>();
                        const jobTypesNameSet = new Set<string>();
                        const jobDistrictSet = new Set<string>();

                        const hotJobs = jobs
                                .filter((job) => job.Hot_Job !== 'Null')
                                .sort(
                                        (a, b) =>
                                                new Date(b.created_at).getTime() -
                                                new Date(a.created_at).getTime()
                                );

                        const normalJobs = jobs
                                .filter((job) => job.Hot_Job === 'Null')
                                .sort(
                                        (a, b) =>
                                                new Date(b.created_at).getTime() -
                                                new Date(a.created_at).getTime()
                                );

                        // Sắp xếp các job bình thường 1 cách ngẫu nhiên
                        // Arrange normal jobs randomly
                        const shuffledNormal = normalJobs.sort(() => Math.random() - 0.5);

                        // Gộp danh sách công việc lên đầu, sau đó là ngẫu nhiên
                        // Merge to-do list to the top, then randomize
                        const prioritizedJobs = [...hotJobs, ...shuffledNormal];

                        jobs.forEach((job) => {
                                // Tách và chuẩn hóa dữ liệu từ jobIndustry
                                if (job.jobIndustry?.name) {
                                        const industries = job.jobIndustry.name
                                                .split(',')
                                                .map((industry) => industry.trim().toLowerCase());
                                        industries.forEach((industry) => {
                                                if (industry) jobIndustriesSet.add(industry);
                                        });
                                }

                                // Lấy và chuẩn hóa TechStack
                                if (job.generalInformation?.tech_stack) {
                                        job.generalInformation.tech_stack.forEach((tech) => {
                                                if (tech)
                                                        techStackSet.add(tech.trim().toLowerCase());
                                        });
                                }

                                // Lấy và chuẩn hóa jobLevel
                                if (job.jobLevel?.name) {
                                        const levels = Array.isArray(job.jobLevel.name)
                                                ? job.jobLevel.name
                                                : [job.jobLevel.name];
                                        levels.forEach((level) => {
                                                if (level)
                                                        jobLevelsSet.add(
                                                                level.trim().toLowerCase()
                                                        );
                                        });
                                }

                                // Lấy và chuẩn hóa kinh nghiệm (experience)
                                if (job.generalInformation?.experience) {
                                        const experience = Array.isArray(
                                                job.generalInformation.experience
                                        )
                                                ? job.generalInformation.experience
                                                : [job.generalInformation.experience];

                                        experience.forEach((ex) => {
                                                if (ex)
                                                        jobExperienceSet.add(
                                                                ex.trim().toLowerCase()
                                                        );
                                        });
                                }

                                if (job.jobType?.work_at) {
                                        const workAt = Array.isArray(job.jobType.work_at)
                                                ? job.jobType.work_at
                                                : [job.jobType.work_at];

                                        workAt.forEach((workAt) => {
                                                if (workAt)
                                                        jobTypesWorkAtSet.add(
                                                                workAt.trim().toLowerCase()
                                                        );
                                        });
                                }

                                if (job.jobType?.name) {
                                        const name = Array.isArray(job.jobType.name)
                                                ? job.jobType.name
                                                : [job.jobType.name];

                                        name.forEach((name) => {
                                                if (name)
                                                        jobTypesNameSet.add(
                                                                name.trim().toLowerCase()
                                                        );
                                        });
                                }

                                if (job.workLocation.district.name) {
                                        const districtNameParts =
                                                job.workLocation.district.name.split(',');
                                        const cityName =
                                                districtNameParts[
                                                        districtNameParts.length - 1
                                                ].trim();

                                        jobDistrictSet.add(cityName);

                                        // Tạo mã encode_arean
                                        const areaEncode = cityName
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
                                                .replace(/\s+/g, '') // Xóa khoảng trắng
                                                .toLowerCase(); // Chuyển về chữ thường

                                        // Thêm encode_arean vào đối tượng district
                                        (
                                                job.workLocation.district as District & {
                                                        encode_arean: string;
                                                }
                                        ).encode_arean = areaEncode;
                                }
                        });

                        // Sắp xếp và chuẩn hóa chữ cái đầu
                        const jobIndustries = Array.from(jobIndustriesSet).map(
                                (industry) => industry.charAt(0).toUpperCase() + industry.slice(1)
                        );
                        const TechStack = Array.from(techStackSet).map(
                                (tech) => tech.charAt(0).toUpperCase() + tech.slice(1)
                        );
                        const jobLevels = Array.from(jobLevelsSet).map(
                                (level) => level.charAt(0).toUpperCase() + level.slice(1)
                        );
                        const Experience = sortExperience(Array.from(jobExperienceSet)).map(
                                // using sortExperience to sort experience from low to high
                                (ex) => ex.charAt(0).toUpperCase() + ex.slice(1)
                        );

                        const jobTypesWorkAt = Array.from(jobTypesWorkAtSet).map(
                                (workAt) => workAt.charAt(0).toUpperCase() + workAt.slice(1)
                        );

                        const jobTypesName = Array.from(jobTypesNameSet).map(
                                (name) => name.charAt(0).toUpperCase() + name.slice(1)
                        );

                        const jobDistrict = Array.from(jobDistrictSet)
                                .map((name) => {
                                        // Loại bỏ phần "(+x)"
                                        let cleanName = name.replace(/\(\+\d+\)/g, '').trim();

                                        // Chuẩn hóa tên địa điểm chung (nếu bắt đầu bằng "Thành phố")
                                        if (cleanName.toLowerCase().startsWith('thành phố')) {
                                                cleanName = cleanName
                                                        .split(' ')
                                                        .slice(2)
                                                        .join(' ')
                                                        .trim(); // Xóa "Thành phố"
                                        }

                                        // Chuẩn hóa chữ cái đầu
                                        cleanName =
                                                cleanName.charAt(0).toUpperCase() +
                                                cleanName.slice(1).toLowerCase();

                                        return cleanName;
                                })
                                .reduce((uniqueDistricts, currentDistrict) => {
                                        // Loại bỏ các tên trùng lặp sau khi chuẩn hóa
                                        if (!uniqueDistricts.includes(currentDistrict)) {
                                                uniqueDistricts.push(currentDistrict);
                                        }
                                        return uniqueDistricts;
                                }, []);

                        // Tạo mảng mã hóa (encode)
                        const jobDistrict_encode = jobDistrict.map(
                                (district) =>
                                        district
                                                .normalize('NFD') // Chuẩn hóa ký tự unicode
                                                .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
                                                .replace(/\s+/g, '') // Xóa khoảng trắng
                                                .toLowerCase() // Chuyển về chữ thường
                        );

                        return {
                                category: {
                                        jobLevels,
                                        jobIndustries,
                                        TechStack,
                                        Experience,
                                        jobTypesWorkAt,
                                        jobTypesName,
                                        jobDistrict,
                                        jobDistrict_encode,
                                },
                                jobs: prioritizedJobs,
                        };
                } catch (error) {
                        // throw new Error(`Error retrieving job details: ${error.message}`);
                        Logger.error(`Error retrieving job details: ${error.message}`);
                        throw new Error(`Error retrieving job details: ${error.message}`);
                }
        }

        async getParamChart(): Promise<{
                totalJobs: number;
                uniqueCompanies: number;
                jobsUpdatedIn48Hours: number;
                jobsCreatedByDate: { date: string; count: number }[];
                jobIndustries: { name: string; jobCount: number }[];
                totalSalaryAboveThreshold: number;
                totalSalaryAboveThreshold_Upto: number;
        }> {
                try {
                        const jobs = await this.jobRepository.find({
                                relations: [
                                        'workLocation',
                                        'workLocation.district',
                                        'company',
                                        'jobType',
                                        'jobLevel',
                                        'jobIndustry',
                                        'generalInformation',
                                ],
                        });

                        // Tính tổng số công việc
                        const totalJobs = jobs.length;

                        // Tính số công ty không trùng lặp
                        const companyNames = new Set(jobs.map((job) => job.company?.name));
                        const uniqueCompanies = companyNames.size;

                        // Tính số công việc được cập nhật trong 48 giờ qua
                        const now = new Date();
                        const jobsUpdatedIn48Hours = jobs.filter((job) => {
                                const createdAt = new Date(job.created_at);
                                const diffInHours =
                                        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                                return diffInHours <= 168;
                        }).length;

                        // Tính số công việc tạo trong 7 ngày qua và đếm số lượng công việc theo ngày
                        const last7Days = [];
                        for (let i = 0; i < 7; i++) {
                                const date = new Date();
                                date.setDate(now.getDate() - i);
                                last7Days.push(date.toISOString().split('T')[0]); // Format date to YYYY-MM-DD
                        }

                        const jobsCreatedByDate = last7Days.map((date) => {
                                const jobCountOnDate = jobs.filter((job) => {
                                        const createdAt = new Date(job.created_at);
                                        const jobDate = createdAt.toISOString().split('T')[0]; // Get date part only
                                        return jobDate === date;
                                }).length;
                                return { date, count: jobCountOnDate };
                        });

                        // Lấy danh sách ngành nghề (industry names) và đếm số công việc theo ngành nghề
                        const industryJobCount: { [key: string]: number } = {};
                        jobs.forEach((job) => {
                                const industryName = job.jobIndustry?.name;
                                if (industryName) {
                                        if (industryJobCount[industryName]) {
                                                industryJobCount[industryName] += 1;
                                        } else {
                                                industryJobCount[industryName] = 1;
                                        }
                                }
                        });

                        // Chuyển đổi kết quả thành mảng các đối tượng với name và jobCount
                        const jobIndustries = Object.keys(industryJobCount).map((industry) => ({
                                name: industry,
                                jobCount: industryJobCount[industry],
                        }));

                        // Sắp xếp các ngành nghề theo jobCount giảm dần và lấy 7 ngành có jobCount cao nhất
                        const sortedIndustries = jobIndustries
                                .sort((a, b) => b.jobCount - a.jobCount) // Sort in descending order of jobCount
                                .slice(0, 7); // Get top 7 industries

                        // Lấy ngành nghề có jobCount cao nhất và lưu vào biến `topIndustry`
                        const topIndustry = sortedIndustries[0];

                        // Tách ngành nghề với jobCount cao nhất ra khỏi mảng
                        const otherIndustries = sortedIndustries.slice(1);

                        // Sắp xếp ngẫu nhiên các ngành còn lại
                        const shuffledIndustries = otherIndustries.sort(() => Math.random() - 0.5);

                        // Kết hợp ngành nghề có jobCount cao nhất vào đầu mảng
                        const finalIndustries = [topIndustry, ...shuffledIndustries];

                        const totalSalaryAboveThreshold = jobs
                                .filter((job) => job.salary_to && job.salary_to > 1000000) // Lọc các job có salary_to > 1,000,000
                                .reduce((sum, job) => sum + job.salary_to, 0);

                        const totalSalaryAboveThreshold_Upto = jobs
                                .filter((job) => job.salary_from === 0 && job.salary_to) // Ensure `salary_from === 0` and `salary_to` exists
                                .reduce((sum, job) => sum + job.salary_to, 0);

                        // Log kết quả
                        console.log('Total Jobs:', totalJobs);
                        console.log('Unique Companies:', uniqueCompanies);
                        console.log('Jobs Updated in Last 48 Hours:', jobsUpdatedIn48Hours);
                        console.log('Jobs Created by Date:', jobsCreatedByDate);
                        console.log('Job Industries:', finalIndustries);

                        return {
                                totalJobs,
                                uniqueCompanies,
                                jobsUpdatedIn48Hours,
                                jobsCreatedByDate,
                                jobIndustries: finalIndustries,
                                totalSalaryAboveThreshold,
                                totalSalaryAboveThreshold_Upto,
                        };
                } catch (error) {
                        throw new Error(`Error retrieving job details: ${error.message}`);
                }
        }

        async getJobsTakeBy(skip: number, take: number): Promise<{ items: Job[]; total: number }> {
                try {
                        const [items, total] = await this.jobRepository.findAndCount({
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
                                skip,
                                take,
                        });

                        const sortItems = items.sort(
                                (a, b) =>
                                        new Date(b.created_at).getTime() -
                                        new Date(a.created_at).getTime()
                        );

                        console.log('Fetched Items:', items);
                        console.log('Total Items:', total);

                        return { items: sortItems, total };
                } catch (error) {
                        throw new Error(`Error retrieving job details: ${error.message}`);
                }
        }

        async viewJobById(jobId: number): Promise<Job | null> {
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

                        job.view = (job.view || 0) + 1;
                        await this.jobRepository.save(job);

                        return job;
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
                                .where('generalInformation.tech_stack LIKE :tech', {
                                        tech: `%${tech}%`,
                                })
                                .getMany();

                        return jobs;
                } catch (error) {
                        throw new Error(`Error retrieving jobs by tech: ${error.message}`);
                }
        }

        async getJobsByNameCompany(name: string): Promise<Job[]> {
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
                                .where('company.name LIKE :name', { name: `%${name}%` })
                                .getMany();

                        return jobs;
                } catch (error) {
                        throw new Error(`Error retrieving jobs by tech: ${error.message}`);
                }
        }

        async getAllJobIndustries(): Promise<string[]> {
                try {
                        this.loggerWinston.log('Fetching all job industries');
                        const jobIndustries = await this.jobIndustryRepository.find();
                        const industryNames = jobIndustries.map((industry) => industry.name);

                        // Split comma-separated industries and flatten the array
                        const splitIndustryNames = industryNames
                                .flatMap((name) => name.split(', ').map((item) => item.trim()))
                                .filter((name) => name.length > 0);

                        //remove Duplicates name industry
                        const uniqueIndustryNames = [...new Set(splitIndustryNames)];
                        return uniqueIndustryNames;
                } catch (error) {
                        this.loggerWinston.error(
                                `Error retrieving job industries: ${error.message}`,
                                error.stack
                        );
                        throw new Error(`Error retrieving job industries: ${error.message}`);
                }
        }

        async postCompanyJob(jobData: any): Promise<Job> {
                const queryRunner = this.jobRepository.manager.connection.createQueryRunner();
                await queryRunner.startTransaction();

                try {
                        this.loggerWinston.log(
                                `BE Service: Processing company job post for title: ${jobData.title}`
                        );
                        console.log(
                                'BE Service: Nhận được jobData từ frontend:',
                                JSON.stringify(jobData, null, 2)
                        );

                        // Kiểm tra các trường bắt buộc
                        if (
                                !jobData.title ||
                                !jobData.companyId ||
                                !jobData.address_name ||
                                !jobData.district_name
                        ) {
                                console.error(
                                        'BE Service: Validation failed - Missing required fields:',
                                        {
                                                title: jobData.title,
                                                companyId: jobData.companyId,
                                                address_name: jobData.address_name,
                                                district_name: jobData.district_name,
                                        }
                                );
                                this.loggerWinston.error('Missing required fields');
                                throw new Error(
                                        'Missing required fields: title, companyId, address_name, district_name'
                                );
                        }

                        // Xác thực recruitmentId và companyId
                        const recruitment = await queryRunner.manager.findOne(Recruitment, {
                                where: {
                                        recruitment_Id: jobData.recruitmentId,
                                        companyId: jobData.companyId,
                                },
                        });
                        if (!recruitment) {
                                console.error('BE Service: Invalid recruitmentId or companyId:', {
                                        recruitmentId: jobData.recruitmentId,
                                        companyId: jobData.companyId,
                                });
                                this.loggerWinston.error('Invalid recruitmentId or companyId');
                                throw new Error('Invalid recruitmentId or companyId');
                        }
                        console.log('BE Service: Validated recruitment:', recruitment);

                        // Tìm công ty
                        const company = await queryRunner.manager.findOne(Company, {
                                where: { companyId: jobData.companyId },
                                relations: ['workLocations'],
                        });
                        if (!company) {
                                console.error('BE Service: Company not found:', jobData.companyId);
                                this.loggerWinston.error(
                                        `Company with ID ${jobData.companyId} not found`
                                );
                                throw new Error(`Company with ID ${jobData.companyId} not found`);
                        }
                        console.log('BE Service: Found company:', company);

                        // Tìm WorkLocation hiện có
                        let workLocation = await queryRunner.manager.findOne(WorkLocation, {
                                where: {
                                        company: { companyId: jobData.companyId },
                                        address_name: jobData.address_name,
                                },
                                relations: ['company', 'district'],
                        });

                        if (!workLocation) {
                                this.loggerWinston.error(
                                        `No WorkLocation found for company ${jobData.companyId} with address ${jobData.address_name}`
                                );
                                throw new Error(
                                        'No matching WorkLocation found for the provided address'
                                );
                        }
                        console.log('BE Service: Found workLocation:', workLocation);

                      

                        // Tạo jobId duy nhất
                        let jobId: number;
                        const maxAttempts = 5;
                        let attempts = 0;
                        const MAX_INT = 2147483647; // Giới hạn của INT có dấu

                        do {
                                jobId = Math.floor(Math.random() * MAX_INT) + 1;
                                attempts++;

                                const existingJob = await queryRunner.manager.findOne(Job, {
                                        where: { jobId },
                                });

                                if (!existingJob) {
                                        break;
                                }

                                if (attempts >= maxAttempts) {
                                        throw new Error(
                                                'Unable to generate a unique jobId after multiple attempts'
                                        );
                                }
                        } while (true);

                        console.log('BE Service: Generated jobId:', jobId);

                        // Tìm hoặc tạo JobIndustry
                        let jobIndustry = await queryRunner.manager.findOne(JobIndustry, {
                                where: { name: jobData.jobIndustry },
                        });
                        if (!jobIndustry) {
                                // Tạo jobIndustryId duy nhất
                                let jobIndustryId: number;
                                attempts = 0;
                                do {
                                        jobIndustryId = Math.floor(Math.random() * MAX_INT) + 1;
                                        attempts++;

                                        const existingJobIndustry =
                                                await queryRunner.manager.findOne(JobIndustry, {
                                                        where: { jobIndustryId },
                                                });

                                        if (!existingJobIndustry) {
                                                break;
                                        }

                                        if (attempts >= maxAttempts) {
                                                throw new Error(
                                                        'Unable to generate a unique jobIndustryId after multiple attempts'
                                                );
                                        }
                                } while (true);

                                jobIndustry = queryRunner.manager.create(JobIndustry, {
                                        jobIndustryId,
                                        name: jobData.jobIndustry,
                                });
                                await queryRunner.manager.save(jobIndustry);
                                this.loggerWinston.info(
                                        `JobIndustry ${jobData.jobIndustry} created`
                                );
                                console.log('BE Service: Created jobIndustry:', jobIndustry);
                        } else {
                                console.log('BE Service: Found jobIndustry:', jobIndustry);
                        }

                        // Tìm hoặc tạo JobType
                        let jobType = await queryRunner.manager.findOne(JobType, {
                                where: { name: jobData.work_at_name },
                        });
                        if (!jobType) {
                                jobType = queryRunner.manager.create(JobType, {
                                        name: jobData.work_at_name,
                                        work_at: jobData.work_at || 'undetermined',
                                });
                                await queryRunner.manager.save(jobType);
                                this.loggerWinston.info(`JobType ${jobData.work_at_name} created`);
                                console.log('BE Service: Created jobType:', jobType);
                        } else {
                                console.log('BE Service: Found jobType:', jobType);
                        }

                        // Tìm hoặc tạo JobLevel
                        let jobLevel = await queryRunner.manager.findOne(JobLevel, {
                                where: { name: jobData.experience },
                        });
                        if (!jobLevel) {
                                jobLevel = queryRunner.manager.create(JobLevel, {
                                        name: jobData.levels,
                                });
                                await queryRunner.manager.save(jobLevel);
                                this.loggerWinston.info(`JobLevel ${jobData.experience} created`);
                                console.log('BE Service: Created jobLevel:', jobLevel);
                        } else {
                                console.log('BE Service: Found jobLevel:', jobLevel);
                        }

                        // Tạo GeneralInformation
                        const generalInformation = queryRunner.manager.create(GeneralInformation, {
                                general_Information_Id: jobId,
                                numberOfRecruits: jobData.numHires || 1,
                                gender: jobData.gender || 'Không yêu cầu',
                                tech_stack: jobData.techStacks || [],
                                experience: jobData.experience,
                        });
                        await queryRunner.manager.save(generalInformation);
                        this.loggerWinston.info(`GeneralInformation created for job`);
                        console.log('BE Service: Created generalInformation:', generalInformation);

                        // Tạo Job
                        const job = queryRunner.manager.create(Job, {
                                jobId: jobId,
                                title: jobData.title,
                                jobLevel,
                                jobType,
                                jobIndustry,
                                workLocation,
                                generalInformation,
                                company,
                                salary: jobData.salaryFrom +'VND' + 'to' + jobData.salaryTo + 'VND',
                                salary_from:
                                        jobData.salaryType === 'Thương lượng'
                                                ? 0
                                                : jobData.salaryFrom,
                                salary_to:
                                        jobData.salaryType === 'Thương lượng'
                                                ? 0
                                                : jobData.salaryTo,
                                description: jobData.descriptions,
                                requirement: jobData.requirements,
                                benefits: jobData.benefits,
                                expire_on: jobData.deadline ? new Date(jobData.deadline) : null,
                                work_time: jobData.workTime || 'undetermined',
                                view: 0,
                                Hot_Job: 'Null',
                                created_at: new Date(),
                                updated_at: new Date(),
                        });

                        await queryRunner.manager.save(job);
                        await queryRunner.commitTransaction();
                        this.loggerWinston.info(
                                `Job posted successfully with title: ${jobData.title}`
                        );
                        console.log('BE Service: Job saved successfully:', job);

                        return job;
                } catch (error) {
                        await queryRunner.rollbackTransaction();
                        this.loggerWinston.error(
                                `Error posting job: ${error.message}`,
                                error.stack
                        );
                        console.error('BE Service: Error posting job:', error.message);
                        throw error;
                } finally {
                        await queryRunner.release();
                }
        }
}
