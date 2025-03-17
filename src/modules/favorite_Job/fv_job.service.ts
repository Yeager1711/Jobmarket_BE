import {
        BadRequestException,
        Injectable,
        NotFoundException,
        ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JobFavorite } from '../../entities/job_favorite.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class FavoriteJobService {
        constructor(
                @InjectRepository(User)
                private readonly userRepository: Repository<User>,

                @InjectRepository(JobFavorite)
                private readonly jobFavoriteRepository: Repository<JobFavorite>,

                @InjectRepository(Job)
                private readonly jobRepository: Repository<Job>
        ) {}

        async addFavoriteJob(userId: number, jobId: number): Promise<JobFavorite> {
                // Kiểm tra user có tồn tại không
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                // Kiểm tra job có tồn tại không
                const job = await this.jobRepository.findOne({ where: { jobId } });
                if (!job) {
                        throw new NotFoundException('Công việc không tồn tại');
                }

                // Kiểm tra xem công việc đã có trong danh sách yêu thích chưa
                const existingFavorite = await this.jobFavoriteRepository.findOne({
                        where: { user: { userId }, job: { jobId } },
                });
                if (existingFavorite) {
                        throw new ConflictException(
                                'Công việc này đã có trong danh sách yêu thích'
                        );
                }

                // Tạo mới bản ghi JobFavorite
                const newFavorite = this.jobFavoriteRepository.create({
                        user,
                        job,
                        saved_at: new Date(),
                });

                return await this.jobFavoriteRepository.save(newFavorite);
        }

        async getUserFavoriteJobs(userId: number): Promise<JobFavorite[]> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                const favorites = await this.jobFavoriteRepository.find({
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
                                favoriteId: true,
                                saved_at: true,
                                user: {
                                        userId: true
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

                return favorites;
        }
}
