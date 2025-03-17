import {
        BadRequestException,
        Injectable,
        NotFoundException,
        ConflictException,
        UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { ResumeCV } from 'src/entities/resumecv.entity';
import { JobFavorite } from 'src/entities/job_favorite.entity';
import { JobApplication } from 'src/entities/job_application.entity';
import { Job } from '../../../entities/job.entity';
import * as bcrypt from 'bcrypt';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class UserService {
        private genAI: GoogleGenerativeAI;

        constructor(
                @InjectRepository(User)
                private readonly userRepository: Repository<User>,

                @InjectRepository(ResumeCV)
                private readonly resumeRepository: Repository<ResumeCV>,

                @InjectRepository(JobFavorite) // Repository cho job_favorite
                private readonly jobFavoriteRepository: Repository<JobFavorite>,

                @InjectRepository(JobApplication) // Repository cho job_application
                private readonly jobApplicationRepository: Repository<JobApplication>,

                @InjectRepository(Job)
                private readonly jobRepository: Repository<Job>
        ) {
                //Khởi tạo api key với Genimi
                const apiKeyGenimi =
                        process.env.GEMINI_API_KEY || 'AIzaSyAVmDicVH0w6erDKRaszQSIj-NYAznmDnE';
                if (!apiKeyGenimi) {
                        throw new Error('GEMINI_API_KEY không được thiết lập trong .env');
                }

                this.genAI = new GoogleGenerativeAI(apiKeyGenimi);

                // Gọi hàm để liệt kê mô hình
                this.listAvailableModels().catch((error) => {
                        console.error('[GoogleGenerativeAI] Error listing models:', error.message);
                });
        }

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
                                'gender',
                                'dateOfBirth',
                                'nationality',
                                'highestDegree',
                                'image',
                                'jobTitle',
                                'industry',
                                'experienceLevel',
                                'yearOfNumberExperience',
                                'expectedSalary',
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
                        'yearOfNumberExperience',
                        'skills',
                        'education',
                        'expectedSalary',
                        'gender',
                        'dateOfBirth',
                        'nationality',
                        'highestDegree',
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

        async setDefaultCv(resumeCVId: number, userId: number): Promise<string> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new BadRequestException('User not found!');
                }

                const cvToSetDefault = await this.resumeRepository.findOne({
                        where: { resumeCVId, user: { userId } },
                });

                if (!cvToSetDefault) {
                        throw new BadRequestException('CV not found or does not belong to user');
                }

                const currentDefaultCv = await this.resumeRepository.findOne({
                        where: { user: { userId }, isDefault: true },
                });

                if (currentDefaultCv && currentDefaultCv.resumeCVId !== resumeCVId) {
                        await this.resumeRepository.update(currentDefaultCv.resumeCVId, {
                                isDefault: false,
                        });
                }

                await this.resumeRepository.update(resumeCVId, { isDefault: true });

                return 'Đã đặt CV làm mặc định';
        }

        async deleteCV(userId: number, resumeCVId: number): Promise<string> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('User not found');
                }

                const cvToDelete = await this.resumeRepository.findOne({
                        where: {
                                resumeCVId,
                                user: { userId },
                        },
                });

                if (!cvToDelete) {
                        throw new BadRequestException('CV not found or does not belong to user');
                }

                // Xóa file vật lý nếu cần
                const fs = require('fs');
                const path = require('path');
                const filePath = path.join(__dirname, '..', '..', '..', cvToDelete.CV_img);
                if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                }

                // Xóa record trong database
                await this.resumeRepository.delete({ resumeCVId });

                return 'Xóa CV thành công';
        }

        async updateUserProfile(userId: number, updateData: any) {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                if (updateData.phoneNumber) {
                        const normalizedPhoneNumber = updateData.phoneNumber;
                        console.log('📌 Normalized phoneNumber:', normalizedPhoneNumber);

                        const existingUserWithPhone = await this.userRepository.findOne({
                                where: { phoneNumber: normalizedPhoneNumber, userId: Not(userId) },
                        });
                        console.log('📌 existingUserWithPhone:', existingUserWithPhone);

                        if (existingUserWithPhone && existingUserWithPhone.userId !== userId) {
                                throw new ConflictException(
                                        'Số điện thoại đã được sử dụng bởi người dùng khác'
                                );
                        }
                        updateData.phoneNumber = normalizedPhoneNumber; // Cập nhật số đã chuẩn hóa
                }

                Object.assign(user, updateData);
                const updatedUser = await this.userRepository.save(user);

                delete updatedUser.password;
                delete updatedUser.userId;

                return updatedUser;
        }

        // Update Email
        async updateEmail(
                userId: number,
                newEmail: string,
                currentPassword: string
        ): Promise<User> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                // Kiểm tra xem tài khoản có mật khẩu không
                if (!user.password) {
                        throw new BadRequestException(
                                'Người dùng này không có mật khẩu, không thể thay đổi email'
                        );
                }

                // So sánh mật khẩu
                const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                if (!isPasswordValid) {
                        throw new UnauthorizedException({
                                field: 'password',
                                message: 'Mật khẩu không chính xác',
                        });
                }

                // Kiểm tra email đã tồn tại chưa
                const existingUserWithEmail = await this.userRepository.findOne({
                        where: { email: newEmail, userId: Not(userId) },
                });
                if (existingUserWithEmail) {
                        throw new ConflictException('Email đã được sử dụng bởi người dùng khác');
                }

                // Cập nhật email
                user.email = newEmail;
                const updatedUser = await this.userRepository.save(user);

                // Xóa các trường nhạy cảm trước khi trả về
                delete updatedUser.password;
                delete updatedUser.userId;

                return updatedUser;
        }

        //Change password user
        async changePassword(
                userId: number,
                newPassword: string,
                currentPassword: string
        ): Promise<User> {
                const user = await this.userRepository.findOne({ where: { userId } });

                if (!user) {
                        throw new NotFoundException('Người dùng không tồn tại');
                }

                if (!user.password) {
                        throw new BadRequestException(
                                'Người dùng này không có mật khẩu mới, không thể thay đổi mật khẩu'
                        );
                }

                // Kiểm tra mật khẩu
                console.log('Current password: ', currentPassword);
                console.log('Stored password: ', newPassword);

                let isPasswordValid: boolean;
                try {
                        isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                        if (!isPasswordValid) {
                                throw new UnauthorizedException({
                                        field: 'password',
                                        message: 'Mật khẩu hiện tại không đúng',
                                });
                        }
                } catch (error) {
                        console.error('Lỗi khi so sánh mật khẩu:', error);
                        throw new BadRequestException('Mật khẩu hiện tại không đúng');
                }

                //Kiểm tra mật khẩu mới có trùng với mật khẩu hiện tại không
                const isSameAsOldPassword = await bcrypt.compare(newPassword, user.password);
                if (isSameAsOldPassword) {
                        throw new BadRequestException(
                                'Mật khẩu mới không được trùng với mật khẩu hiện tại'
                        );
                }

                // Mã hóa mật khẩu mới
                const saltRounds = 10;
                const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

                // Cập nhật mật khẩu mới
                user.password = hashedNewPassword;
                const updatedUser = await this.userRepository.save(user);

                // Xóa các trường không cần thiết trước khi trả về
                delete updatedUser.password;
                delete updatedUser.userId;

                return updatedUser;
        }

        //Chức năng xóa user hiện tại trên tài khoản
        // UserService.ts (phiên bản tối ưu với onDelete: CASCADE)
        async deleteUserCurrent(userId: number): Promise<void> {
                const queryRunner = this.userRepository.manager.connection.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();

                try {
                        const user = await queryRunner.manager.findOne(User, { where: { userId } });
                        if (!user) {
                                throw new NotFoundException('Người dùng không tồn tại');
                        }

                        // Xóa các CV liên quan và file vật lý
                        const resumes = await queryRunner.manager.find(ResumeCV, {
                                where: { user: { userId } },
                        });
                        for (const resume of resumes) {
                                const fs = require('fs');
                                const path = require('path');
                                const filePath = path.join(
                                        __dirname,
                                        '..',
                                        '..',
                                        '..',
                                        resume.CV_img
                                );
                                if (fs.existsSync(filePath)) {
                                        fs.unlinkSync(filePath);
                                }
                        }
                        await queryRunner.manager.delete(ResumeCV, { user: { userId } });

                        // Không cần xóa JobFavorite và JobApplication vì đã có onDelete: CASCADE

                        // Xóa tài khoản người dùng
                        await queryRunner.manager.delete(User, { userId });

                        await queryRunner.commitTransaction();
                } catch (error) {
                        await queryRunner.rollbackTransaction();
                        throw error;
                } finally {
                        await queryRunner.release();
                }
        }

        // AI GENIMI
        async listAvailableModels(): Promise<void> {
                try {
                        const response = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
                                {
                                        method: 'GET',
                                }
                        );
                        const data = await response.json();
                        console.log(
                                '[GoogleGenerativeAI] Available models:',
                                JSON.stringify(data, null, 2)
                        );
                } catch (error) {
                        console.error('[GoogleGenerativeAI] Error listing models:', error.message);
                }
        }

        async compareCompetitiveness(userId: number, jobId: number): Promise<string> {
                console.log(
                        `[compareCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}`
                );

                // Bước 1: Kiểm tra user và job tồn tại
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        console.log(
                                `[compareCompetitiveness] User not found for userId: ${userId}`
                        );
                        throw new NotFoundException('User not found');
                }
                console.log(
                        `[compareCompetitiveness] Found User: ${user.firstName} ${user.lastName}`
                );

                const job = await this.jobRepository.findOne({ where: { jobId } });
                if (!job) {
                        console.log(`[compareCompetitiveness] Job not found for jobId: ${jobId}`);
                        throw new NotFoundException('Job not found');
                }
                console.log(`[compareCompetitiveness] Found Job: ${job.title}`);

                // Bước 2: Lấy danh sách ứng viên khác
                const applications = await this.jobApplicationRepository.find({
                        where: { job: { jobId } },
                        relations: ['user'],
                });
                const totalApplicants = applications.length;
                console.log(`[compareCompetitiveness] Total applicants: ${totalApplicants}`);

                if (totalApplicants === 0) {
                        const result = `Chào ${user.firstName} ${user.lastName}! Hiện tại bạn là ứng viên duy nhất cho công việc này. Tỷ lệ cạnh tranh của bạn là 100%. Cứ tự tin ứng tuyển nhé!`;
                        console.log(`[compareCompetitiveness] Result (no applicants): ${result}`);
                        return result;
                }

                // Bước 3: Kiểm tra CV hoặc mức độ hoàn thành hồ sơ của user hiện tại
                const defaultCV = await this.resumeRepository.findOne({
                        where: { user: { userId }, isDefault: true },
                });

                let isProfileValid = false;
                let cvContent = '';
                if (defaultCV) {
                        isProfileValid = true;
                        cvContent = await this.parseCVContent(defaultCV.CV_img);
                        console.log(
                                `[compareCompetitiveness] Parsed CV content: ${cvContent.substring(0, 100)}...`
                        );
                } else {
                        const hasResumeCV =
                                (await this.resumeRepository.count({
                                        where: { user: { userId } },
                                })) > 0;
                        const profileCompletion = await this.calculateProfileCompletion(
                                user,
                                hasResumeCV
                        );
                        isProfileValid = profileCompletion === 100;
                        console.log(
                                `[compareCompetitiveness] Profile completion: ${profileCompletion}%`
                        );
                }

                if (!isProfileValid) {
                        const errorMsg = `Hey ${user.firstName} ${user.lastName}! Hồ sơ của bạn chưa hoàn thiện 100% hoặc chưa có CV mặc định. Hãy cập nhật thêm thông tin để mình phân tích giúp nhé!`;
                        console.log(`[compareCompetitiveness] Invalid profile: ${errorMsg}`);
                        throw new BadRequestException(errorMsg);
                }

                // Bước 4: Thu thập thông tin của các ứng viên khác
                const otherApplicantsInfo = applications
                        .filter((app) => app.user.userId !== userId)
                        .map((app) => {
                                const otherUser = app.user;
                                return {
                                        name: `${otherUser.firstName} ${otherUser.lastName}`,
                                        skills: otherUser.skills || 'Không có thông tin kỹ năng',
                                        experienceLevel:
                                                otherUser.experienceLevel ||
                                                'Không có thông tin kinh nghiệm',
                                        education:
                                                otherUser.education || 'Không có thông tin học vấn',
                                        jobTitle:
                                                otherUser.jobTitle ||
                                                'Không có thông tin vị trí mong muốn',
                                };
                        });

                // Bước 5: Tạo prompt để Gemini tự phân tích và so sánh
                const prompt = `
        Chào bạn! Mình là AI của JobMarket, sẽ giúp ${user.firstName} ${user.lastName} so sánh mức độ cạnh tranh với các ứng viên khác cho công việc "${job.title}" (ID: ${jobId}).  

        🌟 **Thông tin CV của ${user.firstName} ${user.lastName}:**  
        ${cvContent}  

        🎯 **Yêu cầu công việc:**  
        ${job.requirement}  

        📊 **Thông tin các ứng viên khác (tổng cộng ${totalApplicants} người):**  
        ${otherApplicantsInfo
                .map(
                        (applicant, index) =>
                                `Ứng viên ${index + 1}: ${applicant.name}  
                    - Kỹ năng: ${applicant.skills}  
                    - Kinh nghiệm: ${applicant.experienceLevel}  
                    - Học vấn: ${applicant.education}  
                    - Vị trí mong muốn: ${applicant.jobTitle}`
                )
                .join('\n\n')}  

        📌 **Hãy phân tích và trả lời theo phong cách thân thiện, gần gũi:**  
        1. Đánh giá mức độ phù hợp của ${user.firstName} ${user.lastName} với công việc trên thang điểm 100% (dựa trên kỹ năng, kinh nghiệm, học vấn, và yêu cầu công việc).  
        2. So sánh mức độ cạnh tranh của ${user.firstName} ${user.lastName} với các ứng viên khác, nêu rõ điểm mạnh/yếu của từng bên.  
        3. Gợi ý cải thiện cụ thể cho ${user.firstName} ${user.lastName} để nâng cao khả năng cạnh tranh.  
        Trả lời chi tiết, dễ hiểu, và giống như một người bạn đang trò chuyện nhé!  
    `;

                console.log(
                        `[compareCompetitiveness] Prompt sent to Gemini (trimmed): ${prompt.substring(0, 500)}...`
                );

                try {
                        const model = this.genAI.getGenerativeModel({
                                model: 'gemini-1.5-pro-latest',
                        });
                        const result = await model.generateContent(prompt);
                        const responseText = result.response.text();
                        console.log(
                                `[compareCompetitiveness] Response from Gemini: ${responseText}`
                        );
                        return responseText;
                } catch (error) {
                        console.error(
                                `[compareCompetitiveness] Error from Gemini: ${error.message}`
                        );
                        throw new BadRequestException(
                                'Có lỗi khi phân tích mức độ cạnh tranh. Vui lòng thử lại sau.'
                        );
                }
        }

        // Hàm parse nội dung CV (giả lập, cần tích hợp thư viện parse PDF)
        private async parseCVContent(cvPath: string): Promise<string> {
                console.log(`[parseCVContent] Parsing CV from path: ${cvPath}`);
                const fs = require('fs');
                const path = require('path');
                const pdfPath = path.join(__dirname, '..', '..', '..', cvPath);

                if (!fs.existsSync(pdfPath)) {
                        console.log(`[parseCVContent] CV file not found at: ${pdfPath}`);
                        throw new BadRequestException('Không thể tìm thấy file CV');
                }

                const { pdfParse } = require('pdf-parse');
                const dataBuffer = fs.readFileSync(pdfPath);
                const data = await pdfParse(dataBuffer);
                console.log(
                        `[parseCVContent] Successfully parsed CV, content length: ${data.text.length}`
                );
                return data.text;
        }
}
