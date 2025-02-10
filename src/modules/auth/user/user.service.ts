import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { ResumeCV } from 'src/entities/resumecv.entity';

@Injectable()
export class UserService {
      constructor(
            @InjectRepository(User)
            private readonly userRepository: Repository<User>,

            @InjectRepository(ResumeCV)
            private readonly resumeRepository: Repository<ResumeCV>
      ) {}

      async getUserById(userId: number) {
            return this.userRepository.findOne({
                  where: { userId },
                  select: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'address',
                        'image',
                        'jobTitle',
                        'industry',
                        'experienceLevel',
                        'skills',
                        'education',
                        'isJobSeeker',
                        'isProfileVisible',
                        'createdAt',
                        'updatedAt',
                        'lastLogin',
                        'status',
                  ],
            });
      }

      async uploadResume(userId: number, fileName: string, filePath: string): Promise<ResumeCV> {
            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                  throw new NotFoundException('User not found');
            }

            const cvCount = await this.resumeRepository.count({ where: { user: { userId } } });

            if (cvCount >= 2) {
                  throw new BadRequestException(
                        'Không thể tải tối đa quá 2 CV trong cùng tài khoản'
                  );
            }

            const newResume = this.resumeRepository.create({
                  name_file: fileName, // Lưu tên file gốc
                  CV_img: `/uploads/cvs/${filePath}`, // Đường dẫn để truy cập file
                  user: user,
            });

            return await this.resumeRepository.save(newResume);
      }

      async getCVByUserId(userId: number): Promise<ResumeCV[]> {
            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                  throw new NotFoundException('User not found');
            }

            return await this.resumeRepository.find({ where: { user: { userId } } });
      }
}
