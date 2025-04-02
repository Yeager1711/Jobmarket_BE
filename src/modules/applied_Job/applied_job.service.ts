import {
        BadRequestException,
        Injectable,
        NotFoundException,
        ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeCV } from 'src/entities/resumecv.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { JobApplication } from 'src/entities/job_application.entity';

@Injectable()
export class AppliedJobService {
        constructor(
                @InjectRepository(User)
                private readonly userRepository: Repository<User>,

                @InjectRepository(ResumeCV)
                private readonly resumeRepository: Repository<ResumeCV>,

                @InjectRepository(JobApplication)
                private readonly jobApplicationRepository: Repository<JobApplication>,

                @InjectRepository(Job)
                private readonly jobRepository: Repository<Job>
        ) {}

        async applyJob(
                userId: number,
                jobId: number,
                resumeCVId?: number,
                letterIntroduction?: string
        ): Promise<JobApplication> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                const job = await this.jobRepository.findOne({ where: { jobId } });
                if (!job) {
                        throw new NotFoundException('Công việc không tồn tại');
                }

                // Kiểm tra ứng tuyển với điều kiện resumeCVId khác
                const existingApplication = await this.jobApplicationRepository.findOne({
                        where: {
                                user: { userId },
                                job: { jobId },
                                resumeCVId: resumeCVId, // Thêm điều kiện resumeCVId
                        },
                });
                if (existingApplication) {
                        throw new ConflictException(
                                'Bạn đã ứng tuyển công việc này với CV này rồi'
                        );
                }

                let selectedResume: ResumeCV | null = null;
                if (resumeCVId !== undefined) {
                        selectedResume = await this.resumeRepository.findOne({
                                where: { resumeCVId, user: { userId } },
                        });
                        if (!selectedResume) {
                                throw new NotFoundException(
                                        'CV không tồn tại hoặc không thuộc về bạn'
                                );
                        }
                } else {
                        selectedResume = await this.resumeRepository.findOne({
                                where: { user: { userId }, isDefault: true },
                        });
                        if (!selectedResume) {
                                throw new BadRequestException(
                                        'Bạn chưa có CV mặc định để ứng tuyển'
                                );
                        }
                }

                const application = this.jobApplicationRepository.create({
                        user,
                        job,
                        resumeCVId: selectedResume.resumeCVId,
                        letter_introduction: letterIntroduction || '', // Lưu letter_introduction, mặc định là chuỗi rỗng nếu không có
                        status: 'Pending',
                        applied_at: new Date(),
                });

                return await this.jobApplicationRepository.save(application);
        }

        async getUserAppliedJobs(userId: number): Promise<JobApplication[]> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                const applied = await this.jobApplicationRepository.find({
                        where: { user: { userId } },
                        relations: [
                                'job',
                                'job.workLocation',
                                'job.workLocation.district',
                                'job.company',
                                'job.company.images',
                                'job.jobLevel',
                                'job.jobType',
                                'job.jobIndustry',
                                'job.generalInformation',
                                'job.refJob',
                        ],
                        select: {
                                appliedId: true,
                                applied_at: true,
                                letter_introduction: true,
                                user: {
                                        userId: true,
                                },
                                job: {
                                        jobId: true,
                                        title: true,
                                        salary_from: true,
                                        salary_to: true,
                                        expire_on: true,
                                        work_time: true,
                                        view: true,
                                        created_at: true,
                                        updated_at: true,
                                        workLocation: {
                                                workLocationId: true,
                                                address_name: true,
                                                district: {
                                                        districtId: true,
                                                        name: true,
                                                },
                                        },
                                        company: {
                                                companyId: true,
                                                name: true,
                                                images: {
                                                        image_company: true,
                                                },
                                        },
                                        jobLevel: {
                                                jobLevelId: true,
                                                name: true,
                                        },
                                        jobType: {
                                                jobTypeId: true,
                                                name: true,
                                        },
                                        jobIndustry: {
                                                jobIndustryId: true,
                                                name: true,
                                        },
                                        generalInformation: {
                                                general_Information_Id: true,
                                                numberOfRecruits: true,
                                                gender: true,
                                        },
                                        refJob: {
                                                ref_job_Id: true,
                                                ref_url: true,
                                        },
                                },
                        },
                });

                return applied;
        }
}
