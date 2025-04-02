// UserService.ts
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
import { Order } from 'src/entities/order.entity';
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

                @InjectRepository(JobFavorite)
                private readonly jobFavoriteRepository: Repository<JobFavorite>,

                @InjectRepository(JobApplication)
                private readonly jobApplicationRepository: Repository<JobApplication>,

                @InjectRepository(Job)
                private readonly jobRepository: Repository<Job>,

                @InjectRepository(Order)
                private readonly orderRepository: Repository<Order>
        ) {
                // Khởi tạo API key với Gemini
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

                // Kiểm tra người dùng đã cập nhật CV chưa
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

        async uploadResume(userId: number, file: Express.Multer.File): Promise<ResumeCV> {
                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        throw new NotFoundException('User not found');
                }

                const cvCount = await this.resumeRepository.count({ where: { user: { userId } } });
                if (cvCount >= 2) {
                        throw new BadRequestException(
                                `Tài khoản của bạn đã đủ 2 CV.\nVui lòng xóa để cập nhật mới!`
                        );
                }

                const fs = require('fs');
                const path = require('path');

                const uploadDir = path.join(process.cwd(), 'uploads/cvs');
                if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                }

                try {
                        const fileName = file.filename; // Tên file thực tế trên server
                        const filePath = `/uploads/cvs/${fileName}`;
                        const originalFileName = Buffer.from(file.originalname, 'latin1').toString(
                                'utf8'
                        ); // Giải mã UTF-8

                        console.log('Original file name:', originalFileName); // Debug

                        const newResume = this.resumeRepository.create({
                                name_file: originalFileName, // Tên gốc hiển thị đúng tiếng Việt
                                CV_img: filePath, // Đường dẫn file thực tế
                                user: user,
                        });

                        return await this.resumeRepository.save(newResume);
                } catch (error) {
                        if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                        }
                        throw new BadRequestException('Lỗi khi lưu CV: ' + error.message);
                }
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

                // Chuyển đổi updateAt thành Date nếu cần
                cvList.forEach((cv) => {
                        cv.updatedAt = new Date(cv.updatedAt);
                });

                // Sắp xếp
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

        // Change password user
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

                // Kiểm tra mật khẩu mới có trùng với mật khẩu hiện tại không
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

        // Chức năng xóa user hiện tại trên tài khoản
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

        // AI GEMINI
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

        async analyzeCompetitiveness(
                userId: number,
                jobId: number,
                resumeCVId: number,
                orderId: number
        ): Promise<{
                message: string;
                data: string;
                metrics: {
                        competitivenessFit: number;
                        technicalStrength: number;
                        experienceStrength: number;
                        softSkillsStrength: number;
                        educationScore: number;
                        realExperienceScore: number;
                        jobRequirementMatch: number;
                        competitorComparison: number;
                };
        }> {
                console.log(
                        `[analyzeCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}, orderId: ${orderId}`
                );

                if (!orderId || orderId <= 0) {
                        throw new BadRequestException('Order ID không hợp lệ hoặc thiếu');
                }

                // 1. Kiểm tra xem dữ liệu phân tích đã tồn tại trong DB chưa
                let order = await this.orderRepository.findOne({
                        where: { userId, jobId, resumeId: resumeCVId },
                });

                if (order && order.analyze_text) {
                        console.log(
                                `[analyzeCompetitiveness] Found existing analysis in DB for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
                        );
                        return {
                                message: 'Phân tích mức độ cạnh tranh thành công',
                                data: order.analyze_text,
                                metrics: {
                                        competitivenessFit: order.competitivenessFit || 0,
                                        technicalStrength: order.technicalStrength || 0,
                                        experienceStrength: order.experienceStrength || 0,
                                        softSkillsStrength: order.softSkillsStrength || 0,
                                        educationScore: order.educationScore || 0,
                                        realExperienceScore: order.realExperienceScore || 0,
                                        jobRequirementMatch: order.jobRequirementMatch || 0,
                                        competitorComparison: order.competitorComparison || 0,
                                },
                        };
                }

                // 2. Nếu không có dữ liệu, gọi hàm compareCompetitiveness để tạo mới
                console.log(
                        `[analyzeCompetitiveness] No existing analysis found, generating new analysis for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
                );
                const { analysisResult, percentages, correctedFit } =
                        await this.compareCompetitiveness(userId, jobId, resumeCVId, orderId);

                // 3. Lưu kết quả vào DB
                if (!order) {
                        order = this.orderRepository.create({
                                userId,
                                jobId,
                                resumeId: resumeCVId,
                                analyze_text: analysisResult,
                        });
                } else {
                        order.analyze_text = analysisResult;
                }

                // 4. Gán các giá trị phần trăm và competitivenessFit vào order
                order.technicalStrength = percentages.technicalStrength;
                order.experienceStrength = percentages.experienceStrength;
                order.softSkillsStrength = percentages.softSkillsStrength;
                order.educationScore = percentages.educationScore;
                order.realExperienceScore = percentages.realExperienceScore;
                order.jobRequirementMatch = percentages.jobRequirementMatch;
                order.competitorComparison = percentages.competitorComparison;
                order.competitivenessFit = correctedFit;

                // 5. Lưu vào cơ sở dữ liệu
                try {
                        await this.orderRepository.save(order);
                        console.log(
                                `[analyzeCompetitiveness] Saved new analysis to DB for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}, competitivenessFit: ${order.competitivenessFit}`
                        );
                } catch (error) {
                        console.log(
                                `[analyzeCompetitiveness] Error saving to DB: ${error.message}`
                        );
                        throw new BadRequestException('Lỗi khi lưu dữ liệu vào cơ sở dữ liệu');
                }

                // 6. Trả về phản hồi API với tất cả 8 trường
                return {
                        message: 'Phân tích mức độ cạnh tranh thành công',
                        data: analysisResult,
                        metrics: {
                                competitivenessFit: correctedFit,
                                technicalStrength: percentages.technicalStrength,
                                experienceStrength: percentages.experienceStrength,
                                softSkillsStrength: percentages.softSkillsStrength,
                                educationScore: percentages.educationScore,
                                realExperienceScore: percentages.realExperienceScore,
                                jobRequirementMatch: percentages.jobRequirementMatch,
                                competitorComparison: percentages.competitorComparison,
                        },
                };
        }

        async compareCompetitiveness(
                userId: number,
                jobId: number,
                resumeCVId: number,
                orderId: number
        ): Promise<{
                analysisResult: string;
                percentages: Record<string, number>;
                correctedFit: number;
        }> {
                console.log(
                        `[compareCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}, orderId: ${orderId}`
                );

                const user = await this.userRepository.findOne({ where: { userId } });
                if (!user) {
                        console.log(
                                `[compareCompetitiveness] User not found for userId: ${userId}`
                        );
                        throw new NotFoundException('User not found');
                }

                const job = await this.jobRepository.findOne({ where: { jobId } });
                if (!job) {
                        console.log(`[compareCompetitiveness] Job not found for jobId: ${jobId}`);
                        throw new NotFoundException('Job not found');
                }

                const order = await this.orderRepository.findOne({ where: { orderId } });
                if (!order) {
                        console.log(
                                `[compareCompetitiveness] Order not found for orderId: ${orderId}`
                        );
                        throw new NotFoundException(
                                'Order not found or does not belong to this user'
                        );
                }
                console.log(
                        `[compareCompetitiveness] Found User: ${user.firstName} ${user.lastName}, Job: ${job.title}`
                );

                const selectedCV = await this.resumeRepository.findOne({
                        where: { resumeCVId, user: { userId } },
                });
                if (!selectedCV) {
                        console.log(
                                `[compareCompetitiveness] CV not found for resumeCVId: ${resumeCVId}`
                        );
                        throw new NotFoundException('Selected CV not found');
                }

                const cvContent = await this.parseCVContent(selectedCV.CV_img);
                if (!cvContent) {
                        console.log(
                                `[compareCompetitiveness] No content extracted from CV for resumeCVId: ${resumeCVId}`
                        );
                        throw new BadRequestException(
                                'Không thể trích xuất nội dung từ CV đã chọn'
                        );
                }

                const applications = await this.jobApplicationRepository.find({
                        where: { job: { jobId } },
                        relations: ['user'],
                });
                const totalApplicants = applications.length + 1;

                const isProfileValid = !!cvContent;
                if (!isProfileValid) {
                        throw new BadRequestException(
                                `Hey ${user.firstName} ${user.lastName}! CV của bạn không chứa thông tin hợp lệ để phân tích.`
                        );
                }

                const otherApplicantsInfo = applications
                        .filter((app) => app.user.userId !== userId)
                        .map((app) => ({
                                name: `${app.user.firstName} ${app.user.lastName}`,
                                skills: app.user.skills || 'Không có thông tin kỹ năng',
                                experienceLevel:
                                        app.user.experienceLevel ||
                                        'Không có thông tin kinh nghiệm',
                                yearOfNumberExperience:
                                        app.user.yearOfNumberExperience ||
                                        'Không có thông tin số năm kinh nghiệm',
                                education: app.user.education || 'Không có thông tin học vấn',
                                highestDegree:
                                        app.user.highestDegree ||
                                        'Không có thông tin bằng cấp cao nhất',
                                jobTitle:
                                        app.user.jobTitle || 'Không có thông tin vị trí mong muốn',
                        }));

                const introGreeting = `**Chào bạn! Mình là AI của <key>JobMarket</key>, mình sẽ giúp ${user.firstName} ${user.lastName} so sánh mức độ cạnh tranh với các ứng viên khác cho công việc "<key>${job.title}</key>".`;

                const introContent = `
                    Yêu cầu công việc:
                    ${job.requirement}
                    
                    Thông tin các ứng viên khác (tổng cộng ${totalApplicants} người):
                    ${otherApplicantsInfo
                            .map(
                                    (applicant, index) => `Ứng viên ${index + 1}: ${applicant.name}
                    - Kỹ năng: ${applicant.skills}
                    - Kinh nghiệm: ${applicant.experienceLevel}
                    - Số năm kinh nghiệm: ${applicant.yearOfNumberExperience}
                    - Học vấn: ${applicant.education}
                    - Bằng cấp cao nhất: ${applicant.highestDegree}
                    - Vị trí mong muốn: ${applicant.jobTitle}`
                            )
                            .join('\n\n')}
                    `;

                const introPrompt = `${introGreeting}\n\n${introContent}`;

                // Hàm trích xuất kỹ năng từ yêu cầu công việc
                const extractSkillsFromJobRequirement = (
                        requirement: string
                ): { requiredSkills: string[]; preferredSoftSkills: string[] } => {
                        const requirementLower = requirement.toLowerCase();

                        // Danh sách kỹ năng kỹ thuật phổ biến (có thể mở rộng)
                        const technicalSkillsList = [
                                'html',
                                'css',
                                'javascript',
                                'react.js',
                                'vue.js',
                                'rest api',
                                'node.js',
                                'express',
                                'mongodb',
                                'sql',
                                'java',
                                'python',
                                'spring boot',
                                'docker',
                                'kubernetes',
                                'aws',
                                'git',
                                'typescript',
                                'angular',
                                'php',
                                'laravel',
                        ];

                        // Danh sách kỹ năng mềm phổ biến
                        const softSkillsList = [
                                'agile/scrum',
                                'làm việc nhóm',
                                'giao tiếp',
                                'giải quyết vấn đề',
                                'quản lý thời gian',
                                'thích nghi',
                                'tư duy sáng tạo',
                                'lãnh đạo',
                        ];

                        // Trích xuất kỹ năng kỹ thuật
                        const requiredSkills = technicalSkillsList.filter((skill) =>
                                requirementLower.includes(skill.toLowerCase())
                        );

                        // Trích xuất kỹ năng mềm
                        const preferredSoftSkills = softSkillsList.filter((skill) =>
                                requirementLower.includes(skill.toLowerCase())
                        );

                        // Nếu không tìm thấy kỹ năng nào, trả về giá trị mặc định
                        if (requiredSkills.length === 0) {
                                console.log(
                                        `[extractSkillsFromJobRequirement] No technical skills found in job requirement, defaulting to basic skills`
                                );
                                requiredSkills.push('javascript'); // Giá trị mặc định nếu không tìm thấy kỹ năng
                        }

                        if (preferredSoftSkills.length === 0) {
                                console.log(
                                        `[extractSkillsFromJobRequirement] No soft skills found in job requirement, defaulting to basic soft skills`
                                );
                                preferredSoftSkills.push('giao tiếp'); // Giá trị mặc định nếu không tìm thấy kỹ năng mềm
                        }

                        return { requiredSkills, preferredSoftSkills };
                };

                // Trích xuất kỹ năng từ yêu cầu công việc
                const { requiredSkills, preferredSoftSkills } = extractSkillsFromJobRequirement(
                        job.requirement
                );
                console.log(
                        `[compareCompetitiveness] Extracted requiredSkills: ${requiredSkills}, preferredSoftSkills: ${preferredSoftSkills}`
                );

                const analysisPrompt = `
                    Hãy phân tích mức độ cạnh tranh của ứng viên dựa trên thông tin CV, yêu cầu công việc và dữ liệu từ các ứng viên khác đã ứng tuyển. Trả lời bằng tiếng Việt, sử dụng giọng điệu thân thiện, chuyên nghiệp và chi tiết. Đảm bảo phản hồi có độ dài tối thiểu 2000 ký tự để cung cấp phân tích sâu sắc, không bỏ sót bất kỳ khía cạnh nào. Dưới đây là thông tin chi tiết để phân tích:
                    
                    ---
                    
                    ### Thông tin đầu vào
                    1. **Thông tin CV của ứng viên**:
                    - Họ tên: ${user.firstName} ${user.lastName}
                    - Nội dung CV: ${cvContent}
                    - Kỹ năng công nghệ: <key>HTML</key>, <key>CSS</key>, <key>JavaScript</key>, <key>React.js</key>, <key>Vue.js</key>, <key>REST API</key>.
                    - Dự án cá nhân:
                        - <key>Website bán cây cảnh</key>: Phát triển giao diện người dùng bằng <key>React.js</key>, tích hợp <key>REST API</key> để hiển thị sản phẩm, tối ưu hóa tốc độ tải trang.
                        - <key>Website đặt vé xem phim</key>: Sử dụng <key>Vue.js</key>, thiết kế responsive, tích hợp thanh toán qua API bên thứ ba.
                    - Kinh nghiệm thực tế:
                        - Thực tập tại <key>DATVIETSOFTWARE</key> (3 tháng): Hỗ trợ phát triển giao diện Frontend, làm việc với <key>React.js</key> và <key>REST API</key>, tham gia nhóm 5 người.
                    - Học vấn: Sinh viên năm 4, chuyên ngành Công nghệ Thông tin, <key>Đại học HUTECH</key>.
                    - Kỹ năng mềm: Không có thông tin cụ thể về <key>giao tiếp</key>, <key>làm việc nhóm</key>, hoặc quy trình phát triển phần mềm (<key>Agile/Scrum</key>).
                    - Chứng chỉ: Không có chứng chỉ liên quan đến lập trình hoặc Frontend.
                    
                    2. **Yêu cầu công việc**:
                    - Tiêu đề: <key>${job.title}</key>
                    - Kỹ năng bắt buộc: ${requiredSkills.map((skill) => `<key>${skill}</key>`).join(', ')}.
                    - Kỹ năng ưu tiên: ${preferredSoftSkills.map((skill) => `<key>${skill}</key>`).join(', ')}.
                    - Kinh nghiệm: 0-1 năm (Fresher), ưu tiên ứng viên có dự án thực tế hoặc thực tập.
                    - Học vấn: Tốt nghiệp hoặc đang học CNTT hoặc ngành liên quan.
                    - Mức lương đề xuất: $12,000 - $18,000/năm (tùy kinh nghiệm và kỹ năng).
                    
                    3. **Thông tin các ứng viên khác** (tổng cộng ${totalApplicants - 1} ứng viên khác):
                    ${otherApplicantsInfo
                            .map(
                                    (applicant, index) => `
                    - Ứng viên ${index + 1}: ${applicant.name}
                        - Kỹ năng: ${applicant.skills}
                        - Kinh nghiệm: ${applicant.experienceLevel}
                        - Số năm kinh nghiệm: ${applicant.yearOfNumberExperience}
                        - Học vấn: ${applicant.education}
                        - Bằng cấp cao nhất: ${applicant.highestDegree}
                        - Vị trí mong muốn: ${applicant.jobTitle}
                    `
                            )
                            .join('\n')}
                    
                    ---
                    
                    ### Yêu cầu phân tích
                    Hãy phân tích và trả về kết quả theo cấu trúc cố định dưới đây. Đảm bảo mỗi phần được giải thích chi tiết, nhưng **không hiển thị giá trị phần trăm trực tiếp trong nội dung văn bản chính**, trừ phần "Danh sách xếp hạng". Thay vào đó, tính toán các giá trị phần trăm và cung cấp chúng trong JSON ở cuối phản hồi. Các mục chính cần tính phần trăm bao gồm: "<key>Mức độ phù hợp với công việc</key>", "<key>Điểm mạnh kỹ thuật</key>", "<key>Kinh nghiệm thực tế</key>", "<key>Học vấn</key>", v.v. "<key>Mức độ phù hợp với công việc</key>" được tính bằng trung bình cộng của 7 mục: "<key>Điểm mạnh kỹ thuật</key>", "<key>Điểm mạnh kinh nghiệm</key>", "<key>Điểm mạnh kỹ năng mềm</key>", "<key>Học vấn</key>", "<key>Kinh nghiệm thực tế</key>", "<key>So sánh với yêu cầu</key>", và "<key>So sánh với ứng viên khác</key>". Xếp hạng trong phần "So sánh với ứng viên khác" và "Danh sách xếp hạng" phải đồng nhất, dựa trên mức độ phù hợp tổng thể của ứng viên (${user.firstName} ${user.lastName}) so với các ứng viên khác.
                    
                    **Quan trọng**: 
                    - Hãy giải thích chi tiết cách bạn đánh giá từng mục dựa trên dữ liệu đầu vào, bao gồm việc so sánh với yêu cầu công việc và các ứng viên khác, nhưng không hiển thị số liệu phần trăm trong văn bản chính (trừ phần "Danh sách xếp hạng").
                    - Tự động nhận diện các từ khóa quan trọng (bao gồm nhưng không giới hạn: tên kỹ năng, công ty, trường học, dự án, tiêu đề công việc, các mục phân tích như "<key>Mức độ phù hợp với công việc</key>", "<key>Điểm mạnh kỹ thuật</key>", v.v.) dựa trên ngữ cảnh và bọc chúng trong thẻ <key></key> một cách đồng nhất trong toàn bộ nội dung trả về. Không bỏ sót bất kỳ từ khóa quan trọng nào.
                    - Xếp hạng trong phần "So sánh với ứng viên khác" và "Danh sách xếp hạng" phải dựa trên mức độ phù hợp tổng thể, được tính từ các giá trị phần trăm trong JSON.
                    - Trong phần "Danh sách xếp hạng", hiển thị thông tin chi tiết của từng ứng viên theo định dạng bảng với các cột: "Xếp hạng chung", "Tổng", "Kỹ năng", "Kinh nghiệm", "Kỹ năng mềm", "Học vấn". Sử dụng các giá trị phần trăm từ JSON để điền vào các cột này.
                    - **Cung cấp danh sách các giá trị phần trăm ở định dạng JSON ngay sau phần Kết luận**:
                      {
                        "technicalStrength": X,
                        "experienceStrength": X,
                        "softSkillsStrength": X,
                        "educationScore": X,
                        "realExperienceScore": X,
                        "jobRequirementMatch": X,
                        "competitorComparison": X
                      }
                    
                    ---
                    
                    ## 1. Đánh giá mức độ phù hợp của ${user.firstName} ${user.lastName}
                    - **So sánh với ứng viên khác**: Xếp hạng X/${totalApplicants}  
                    - **Mức lương thị trường**: $X - $Y/năm  
                    - **Giải thích chi tiết**:  
                    
                    ## 2. So sánh mức độ cạnh tranh
                    - **Điểm mạnh kỹ thuật**:  
                    - **Điểm yếu kỹ thuật**:  
                    - **Điểm mạnh kinh nghiệm**:  
                    - **Điểm yếu kinh nghiệm**:  
                    - **Điểm mạnh kỹ năng mềm**:  
                    - **Điểm yếu kỹ năng mềm**:  
                    
                    ## 3. Học vấn
                    - **Học vấn**:  
                    - **Chứng chỉ và khóa học**:  
                    - **Tiềm năng phát triển**:  
                    
                    ## 4. Phân tích kinh nghiệm
                    - **Kinh nghiệm thực tế**:  
                    - **So sánh với yêu cầu**:  
                    - **So sánh với ứng viên khác**:  
                    
                    ## 5. Gợi ý cải thiện
                    1. ...  
                    2. ...  
                    3. ...  
                    4. ...  
                    5. ...  
                    6. ...  
                    7. ...  
                    
                    ## 6. Xếp hạng chung
                    - **Danh sách xếp hạng** (hiển thị dưới dạng bảng với các cột: "Xếp hạng chung", "Tổng", "Kỹ năng", "Kinh nghiệm", "Kỹ năng mềm", "Học vấn"):
                    | Xếp hạng chung | Tổng | Kỹ năng | Kinh nghiệm | Kỹ năng mềm | Học vấn |
                    |----------------|------|---------|-------------|-------------|---------|
                    | Bạn Top 1      | X%   | X%      | X%          | X%          | X%      |
                    | Ứng viên Top 2 | X%   | X%      | X%          | X%          | X%      |
                    | Ứng viên Top 3 | X%   | X%      | X%          | X%          | X%      |
                    | ...            | ...  | ...     | ...         | ...         | ...     |
                    
                    ## 7. Kết luận
                    ...
                    `;

                const prompt = `${introPrompt}\n\n---\n\n${analysisPrompt}`;
                console.log(
                        `[compareCompetitiveness] Prompt sent to AI: ${prompt.substring(0, 1000)}...`
                );

                try {
                        const model = this.genAI.getGenerativeModel({
                                model: 'gemini-1.5-flash-latest',
                                generationConfig: { maxOutputTokens: 2000 },
                        });
                        const responseText = await model
                                .generateContent(prompt)
                                .then((result) => result.response.text());

                        console.log(`[compareCompetitiveness] Full AI response: ${responseText}`);

                        // Hàm trích xuất JSON chứa các giá trị phần trăm từ phản hồi AI
                        const extractPercentagesFromJson = (
                                text: string
                        ): Record<string, number> => {
                                const jsonMatch = text.match(
                                        /{[\s\S]*"competitorComparison":\s*\d+\.?\d*\s*}/
                                );
                                if (!jsonMatch) {
                                        console.log(
                                                `[compareCompetitiveness] No JSON found in AI response`
                                        );
                                        throw new BadRequestException(
                                                'Không thể trích xuất giá trị phần trăm từ phản hồi AI'
                                        );
                                }

                                try {
                                        const parsed = JSON.parse(jsonMatch[0]);
                                        return {
                                                technicalStrength: parsed.technicalStrength || 0,
                                                experienceStrength: parsed.experienceStrength || 0,
                                                softSkillsStrength: parsed.softSkillsStrength || 0,
                                                educationScore: parsed.educationScore || 0,
                                                realExperienceScore:
                                                        parsed.realExperienceScore || 0,
                                                jobRequirementMatch:
                                                        parsed.jobRequirementMatch || 0,
                                                competitorComparison:
                                                        parsed.competitorComparison || 0,
                                        };
                                } catch (error) {
                                        console.log(
                                                `[compareCompetitiveness] Error parsing JSON: ${error.message}`
                                        );
                                        throw new BadRequestException(
                                                'Lỗi khi phân tích JSON từ phản hồi AI'
                                        );
                                }
                        };

                        // Trích xuất các giá trị phần trăm từ JSON
                        const percentages = extractPercentagesFromJson(responseText);

                        // Tính toán lại mức độ phù hợp dựa trên công thức trung bình cộng
                        const calculatedFit =
                                (percentages.technicalStrength +
                                        percentages.experienceStrength +
                                        percentages.softSkillsStrength +
                                        percentages.educationScore +
                                        percentages.realExperienceScore +
                                        percentages.jobRequirementMatch +
                                        percentages.competitorComparison) /
                                7;
                        const correctedFit = parseFloat(calculatedFit.toFixed(1));

                        // Hàm đánh giá các ứng viên khác dựa trên thông tin từ entity User
                        const evaluateApplicant = (
                                applicant: any,
                                requiredSkills: string[],
                                preferredSoftSkills: string[]
                        ): Record<string, number> => {
                                // Đánh giá kỹ năng kỹ thuật (technicalStrength)
                                let technicalStrength = 0;
                                if (
                                        applicant.skills &&
                                        applicant.skills !== 'Không có thông tin kỹ năng'
                                ) {
                                        const skills = applicant.skills.toLowerCase();
                                        const matchedSkills = requiredSkills.filter((skill) =>
                                                skills.includes(skill.toLowerCase())
                                        );
                                        technicalStrength =
                                                (matchedSkills.length / requiredSkills.length) *
                                                100;
                                } else {
                                        technicalStrength = 20; // Giá trị mặc định nếu không có thông tin
                                        console.log(
                                                `[evaluateApplicant] ${applicant.name}: No skills info, defaulting technicalStrength to 20%`
                                        );
                                }

                                // Đánh giá kinh nghiệm (experienceStrength và realExperienceScore)
                                let experienceStrength = 0;
                                let realExperienceScore = 0;
                                if (
                                        applicant.experienceLevel &&
                                        applicant.experienceLevel !==
                                                'Không có thông tin kinh nghiệm'
                                ) {
                                        const expLevel = applicant.experienceLevel.toLowerCase();
                                        if (expLevel.includes('senior')) {
                                                experienceStrength = 90;
                                                realExperienceScore = 90;
                                        } else if (
                                                expLevel.includes('mid-level') ||
                                                expLevel.includes('nhân viên')
                                        ) {
                                                experienceStrength = 60;
                                                realExperienceScore = 60;
                                        } else if (
                                                expLevel.includes('junior') ||
                                                expLevel.includes('thực tập')
                                        ) {
                                                experienceStrength = 30;
                                                realExperienceScore = 30;
                                        } else {
                                                experienceStrength = 20;
                                                realExperienceScore = 20;
                                        }

                                        // Điều chỉnh dựa trên số năm kinh nghiệm (yearOfNumberExperience)
                                        if (
                                                applicant.yearOfNumberExperience &&
                                                applicant.yearOfNumberExperience !==
                                                        'Không có thông tin số năm kinh nghiệm'
                                        ) {
                                                const years = parseFloat(
                                                        applicant.yearOfNumberExperience
                                                );
                                                if (!isNaN(years)) {
                                                        if (years >= 5) {
                                                                experienceStrength = Math.min(
                                                                        experienceStrength + 20,
                                                                        100
                                                                );
                                                                realExperienceScore = Math.min(
                                                                        realExperienceScore + 20,
                                                                        100
                                                                );
                                                        } else if (years >= 2) {
                                                                experienceStrength = Math.min(
                                                                        experienceStrength + 10,
                                                                        100
                                                                );
                                                                realExperienceScore = Math.min(
                                                                        realExperienceScore + 10,
                                                                        100
                                                                );
                                                        }
                                                }
                                        }
                                } else {
                                        experienceStrength = 20;
                                        realExperienceScore = 20;
                                        console.log(
                                                `[evaluateApplicant] ${applicant.name}: No experience info, defaulting experienceStrength and realExperienceScore to 20%`
                                        );
                                }

                                // Đánh giá kỹ năng mềm (softSkillsStrength)
                                let softSkillsStrength = 0;
                                if (
                                        applicant.skills &&
                                        applicant.skills !== 'Không có thông tin kỹ năng'
                                ) {
                                        const skills = applicant.skills.toLowerCase();
                                        const matchedSoftSkills = preferredSoftSkills.filter(
                                                (skill) => skills.includes(skill.toLowerCase())
                                        );
                                        softSkillsStrength =
                                                (matchedSoftSkills.length /
                                                        preferredSoftSkills.length) *
                                                100;
                                } else {
                                        softSkillsStrength = 20; // Giá trị mặc định nếu không có thông tin
                                        console.log(
                                                `[evaluateApplicant] ${applicant.name}: No soft skills info, defaulting softSkillsStrength to 20%`
                                        );
                                }

                                // Đánh giá học vấn (educationScore)
                                let educationScore = 0;
                                if (
                                        applicant.highestDegree &&
                                        applicant.highestDegree !==
                                                'Không có thông tin bằng cấp cao nhất'
                                ) {
                                        const degree = applicant.highestDegree.toLowerCase();
                                        if (degree.includes('tiến sĩ') || degree.includes('phd')) {
                                                educationScore = 100;
                                        } else if (
                                                degree.includes('thạc sĩ') ||
                                                degree.includes('master')
                                        ) {
                                                educationScore = 90;
                                        } else if (
                                                degree.includes('đại học') ||
                                                degree.includes('bachelor')
                                        ) {
                                                educationScore = 80;
                                        } else if (
                                                degree.includes('cao đẳng') ||
                                                degree.includes('associate')
                                        ) {
                                                educationScore = 60;
                                        } else {
                                                educationScore = 40;
                                        }
                                } else {
                                        educationScore = 40; // Giá trị mặc định nếu không có thông tin
                                        console.log(
                                                `[evaluateApplicant] ${applicant.name}: No education info, defaulting educationScore to 40%`
                                        );
                                }

                                // Đánh giá mức độ phù hợp với yêu cầu công việc (jobRequirementMatch)
                                let jobRequirementMatch = 0;
                                if (
                                        applicant.skills &&
                                        applicant.skills !== 'Không có thông tin kỹ năng'
                                ) {
                                        const skills = applicant.skills.toLowerCase();
                                        const matchedRequiredSkills = requiredSkills.filter(
                                                (skill) => skills.includes(skill.toLowerCase())
                                        );
                                        const matchedPreferredSkills = preferredSoftSkills.filter(
                                                (skill) => skills.includes(skill.toLowerCase())
                                        );
                                        jobRequirementMatch =
                                                ((matchedRequiredSkills.length /
                                                        requiredSkills.length) *
                                                        0.7 +
                                                        (matchedPreferredSkills.length /
                                                                preferredSoftSkills.length) *
                                                                0.3) *
                                                100;
                                } else {
                                        jobRequirementMatch = 20; // Giá trị mặc định nếu không có thông tin
                                        console.log(
                                                `[evaluateApplicant] ${applicant.name}: No skills info, defaulting jobRequirementMatch to 20%`
                                        );
                                }

                                // Đánh giá so sánh với ứng viên khác (competitorComparison)
                                // Sẽ được tính sau khi có điểm của tất cả ứng viên
                                const competitorComparison = 0; // Placeholder, sẽ được cập nhật sau

                                return {
                                        technicalStrength,
                                        experienceStrength,
                                        softSkillsStrength,
                                        educationScore,
                                        realExperienceScore,
                                        jobRequirementMatch,
                                        competitorComparison,
                                };
                        };

                        // Đánh giá các ứng viên khác
                        const otherApplicantsPercentages = otherApplicantsInfo.map((applicant) =>
                                evaluateApplicant(applicant, requiredSkills, preferredSoftSkills)
                        );

                        // Tính tổng điểm cho từng ứng viên
                        const applicantsWithScores = [
                                {
                                        name: `${user.firstName} ${user.lastName}`,
                                        totalScore: correctedFit,
                                        percentages,
                                },
                                ...otherApplicantsPercentages.map((applicantPercentages, index) => {
                                        const totalScore = parseFloat(
                                                (
                                                        (applicantPercentages.technicalStrength +
                                                                applicantPercentages.experienceStrength +
                                                                applicantPercentages.softSkillsStrength +
                                                                applicantPercentages.educationScore +
                                                                applicantPercentages.realExperienceScore +
                                                                applicantPercentages.jobRequirementMatch +
                                                                applicantPercentages.competitorComparison) /
                                                        7
                                                ).toFixed(1)
                                        );
                                        return {
                                                name: otherApplicantsInfo[index].name,
                                                totalScore,
                                                percentages: applicantPercentages,
                                        };
                                }),
                        ];

                        // Sắp xếp theo tổng điểm (từ cao đến thấp)
                        applicantsWithScores.sort((a, b) => b.totalScore - a.totalScore);

                        // Cập nhật competitorComparison dựa trên xếp hạng
                        applicantsWithScores.forEach((applicant, index) => {
                                const rank = index + 1;
                                const total = applicantsWithScores.length;
                                applicant.percentages.competitorComparison = parseFloat(
                                        (((total - rank + 1) / total) * 100).toFixed(1)
                                );
                                applicant.totalScore = parseFloat(
                                        (
                                                (applicant.percentages.technicalStrength +
                                                        applicant.percentages.experienceStrength +
                                                        applicant.percentages.softSkillsStrength +
                                                        applicant.percentages.educationScore +
                                                        applicant.percentages.realExperienceScore +
                                                        applicant.percentages.jobRequirementMatch +
                                                        applicant.percentages
                                                                .competitorComparison) /
                                                7
                                        ).toFixed(1)
                                );
                        });

                        // Sắp xếp lại sau khi cập nhật competitorComparison
                        applicantsWithScores.sort((a, b) => b.totalScore - a.totalScore);

                        // Xác định xếp hạng của Huỳnh Nam
                        const rank =
                                applicantsWithScores.findIndex(
                                        (applicant) =>
                                                applicant.name ===
                                                `${user.firstName} ${user.lastName}`
                                ) + 1;
                        const totalRank = totalApplicants;

                        // Tạo bảng xếp hạng chi tiết
                        // Tạo bảng xếp hạng chi tiết
                        const rankingTable = applicantsWithScores
                                .map((applicant, index) => {
                                        const rankLabel =
                                                applicant.name ===
                                                `${user.firstName} ${user.lastName}`
                                                        ? 'Bạn'
                                                        : 'Ứng viên';
                                        return `| ${rankLabel} Top ${index + 1} | ${applicant.totalScore}% | ${applicant.percentages.technicalStrength}% | ${applicant.percentages.realExperienceScore}% | ${applicant.percentages.softSkillsStrength}% | ${applicant.percentages.educationScore}% |`;
                                })
                                .join('\n');

                        // Log giá trị calculatedFit, correctedFit và xếp hạng để kiểm tra
                        console.log(
                                `[compareCompetitiveness] Calculated Fit: ${calculatedFit}%, Corrected Fit: ${correctedFit}%, Rank: ${rank}/${totalRank}`
                        );

                        // Thay thế xếp hạng và bảng xếp hạng trong phản hồi AI
                        let finalResponseText = responseText
                                .replace(
                                        /<key>So sánh với ứng viên khác<\/key>: Xếp hạng X\/\d+/,
                                        `<key>So sánh với ứng viên khác</key>: Xếp hạng ${rank}/${totalRank}`
                                )
                                .replace(
                                        /<key>Mức lương thị trường<\/key>: \$X - \$Y\/năm/,
                                        `<key>Mức lương thị trường</key>: $12,000 - $18,000/năm`
                                )
                                .replace(
                                        /\| Xếp hạng chung\s+\| Tổng\s+\| Kỹ năng\s+\| Kinh nghiệm\s+\| Kỹ năng mềm\s+\| Học vấn\s+\|\s*([\s\S]*?)(?=\n## 7\. Kết luận)/,
                                        `| Xếp hạng chung | Tổng | Kỹ năng | Kinh nghiệm | Kỹ năng mềm | Học vấn |\n${rankingTable}`
                                );

                        const finalResult = `${introGreeting}\n\n${introContent}\n\n---\n\n${finalResponseText}`;
                        console.log(
                                `[compareCompetitiveness] Final result to be returned: ${finalResult.substring(0, 1500)}...`
                        );

                        return {
                                analysisResult: finalResult,
                                percentages,
                                correctedFit,
                        };
                } catch (error) {
                        console.log(`[compareCompetitiveness] Error: ${error.message}`);
                        throw new BadRequestException(
                                'Có lỗi khi phân tích mức độ cạnh tranh. Vui lòng thử lại sau.'
                        );
                }
        }

        private async parseCVContent(cvPath: string): Promise<string> {
                console.log(`[parseCVContent] Parsing CV from path: ${cvPath}`);
                const fs = require('fs');
                const path = require('path');

                // Xây dựng đường dẫn từ thư mục gốc của dự án
                const rootDir = process.cwd(); // Thư mục gốc: C:\Users\Admin\Desktop\JobMarket
                const pdfPath = path.join(rootDir, cvPath.replace(/^\//, '')); // Xóa dấu / đầu nếu có

                console.log(`[parseCVContent] Resolved path: ${pdfPath}`);

                // Kiểm tra file có tồn tại không
                if (!fs.existsSync(pdfPath)) {
                        console.log(`[parseCVContent] CV file not found at: ${pdfPath}`);
                        throw new BadRequestException('Không thể tìm thấy file CV');
                }

                try {
                        const pdfParse = require('pdf-parse');
                        const dataBuffer = fs.readFileSync(pdfPath);
                        const data = await pdfParse(dataBuffer);

                        console.log(
                                `[parseCVContent] Successfully parsed CV, content length: ${data.text.length}, pages: ${data.numpages}`
                        );
                        console.log(`[parseCVContent] Raw Extracted Text: \n${data.text}`);

                        if (!data.text || data.text.trim() === '') {
                                console.log('[parseCVContent] No text extracted from CV');
                                throw new BadRequestException(
                                        'Không thể trích xuất nội dung từ CV. File có thể là hình ảnh hoặc không chứa văn bản.'
                                );
                        }

                        const cleanedText = data.text
                                .replace(/\n+/g, '\n')
                                .replace(/\s+/g, ' ')
                                .trim();
                        console.log(`[parseCVContent] Cleaned Text: \n${cleanedText}`);

                        return cleanedText;
                } catch (error) {
                        console.error(`[parseCVContent] Error parsing CV: ${error.message}`);
                        throw new BadRequestException(
                                'Có lỗi khi phân tích CV. Vui lòng kiểm tra file và thử lại.'
                        );
                }
        }

        //Apply Job
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
}
