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
            const user = await this.userRepository.findOne({
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

            if (!user) {
                  throw new NotFoundException('User not found');
            }

            // Kiểm tra xem người dùng đã có CV chưa
            const hasResumeCV =
                  (await this.resumeRepository.count({ where: { user: { userId } } })) > 0;

            // Tính toán mức độ hoàn thành hồ sơ
            const profileCompletion = await this.calculateProfileCompletion(user, hasResumeCV);

            return {
                  ...user,
                  profileCompletion: `${profileCompletion}%`,
            };
      }

      async calculateProfileCompletion(user: User, hasResumeCV: boolean): Promise<number> {
            const requiredFields = [
                  'address',
                  'image',
                  'jobTitle',
                  'industry',
                  'experienceLevel',
                  'skills',
                  'education',
                  'experienceSalary',
            ];

            let completedFields = 0;

            // Kiểm tra từng trường bắt buộc
            requiredFields.forEach((field) => {
                  if (user[field]) {
                        completedFields++;
                  }
            });

            //Kiểm tra người dùng đã cập nhật CV chưa
            if (hasResumeCV) {
                  completedFields++;
            }

            const totalFields = requiredFields.length + 1;
            const completionPercentage = (completedFields / totalFields) * 100;

            return Math.round(completionPercentage);
      }

      async uploadImage(userId: number, imagePath: string): Promise<User> {
            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                  throw new NotFoundException('User not found');
            }

            user.image = `/uploads/images/${imagePath}`;
            return await this.userRepository.save(user);
      }

      async uploadResume(userId: number, fileName: string, filePath: string): Promise<ResumeCV> {
            const user = await this.userRepository.findOne({ where: { userId } });
            if (!user) {
                  throw new NotFoundException('User not found');
            }

            const cvCount = await this.resumeRepository.count({ where: { user: { userId } } });

            if (cvCount >= 2) {
                  throw new BadRequestException(
                        `Tài khoản của bạn đã đủ 2 CV.\n    Vui lòng xóa để cập nhật mới!`
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

            const cvList = await this.resumeRepository.find({
                  where: { user: { userId } },
                  order: { updatedAt: 'ASC' }, // Sắp xếp từ sớm nhất đến trễ nhất
            });

            //Chuyển đổi updateAt  thành Date nếu cần
            cvList.forEach((cv) => {
                  cv.updatedAt = new Date(cv.updatedAt);
            });

            //Sắp xếp
            cvList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            return cvList;
      }

      async setDefaultCv(userId: number, resumeCVId: number): Promise<string> {
            //Kiểm tra user có tồn tại hay không
            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                  throw new BadRequestException('User not found !');
            }

            // Kiểm tra Cv cóc tồn tại hay không
            const cvToSetDefault = await this.resumeRepository.findOne({
                  where: { resumeCVId, user: { userId } },
            });

            if (!cvToSetDefault) {
                  throw new BadRequestException('CV not found or does not belong to user');
            }

            //Tìm CV hiện đang được làm mặc định
            const currentDefaultCv = await this.resumeRepository.findOne({
                  where: { user: { userId }, isDefault: true },
            });

            // Nếu Cv có mặc định, cập nhật về 0
            if (currentDefaultCv && currentDefaultCv.resumeCVId !== resumeCVId) {
                  await this.resumeRepository.update(currentDefaultCv.resumeCVId, {
                        isDefault: false,
                  });
            }

            // Đặt CV mới làm mặc định
            await this.resumeRepository.update(resumeCVId, { isDefault: true });

            return 'CV đã được đặt làm mặc định thành công!';
      }

      async updateUserProfile(userId: number, updateData: any) {
            const user = await this.userRepository.findOne({ where: { userId } });

            if (!user) {
                  throw new NotFoundException('Người dùng không tồn tại');
            }

            Object.assign(user, updateData);
            const updatedUser = await this.userRepository.save(user);

            // ❌ Xóa userId, password trước khi trả về FrontEnd
            delete updatedUser.password;
            delete updatedUser.userId;
            return updatedUser;
      }
}
