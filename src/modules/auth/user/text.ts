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

            @InjectRepository(JobFavorite) // Repository cho job_favorite
            private readonly jobFavoriteRepository: Repository<JobFavorite>,

            @InjectRepository(JobApplication) // Repository cho job_application
            private readonly jobApplicationRepository: Repository<JobApplication>,

            @InjectRepository(Job)
            private readonly jobRepository: Repository<Job>,

            @InjectRepository(Order)
            private readonly orderRepository: Repository<Order>
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

    async uploadResume(userId: number, file: Express.Multer.File): Promise<ResumeCV> {
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

            const fs = require('fs');
            const path = require('path');

            // Đảm bảo thư mục uploads/cvs tồn tại
            const uploadDir = path.join(process.cwd(), 'uploads/cvs');
            if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
            }

            // File đã được FileInterceptor lưu, chỉ cần lấy tên file và đường dẫn
            const fileName = file.filename; // Tên file được tạo bởi diskStorage
            const filePath = `/uploads/cvs/${fileName}`; // Đường dẫn để lưu vào database

            const newResume = this.resumeRepository.create({
                    name_file: file.originalname, // Lưu tên file gốc
                    CV_img: filePath, // Đường dẫn để truy cập file
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

    async compareCompetitiveness(
            userId: number,
            jobId: number,
            resumeCVId: number
    ): Promise<string> {
            console.log(
                    `[compareCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
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

            console.log(
                    `[compareCompetitiveness] Found User: ${user.firstName} ${user.lastName}, Job: ${job.title}`
            );

            // Lấy CV dựa trên resumeCVId thay vì tìm CV mặc định
            const selectedCV = await this.resumeRepository.findOne({
                    where: { resumeCVId, user: { userId } },
            });
            if (!selectedCV) {
                    console.log(
                            `[compareCompetitiveness] CV not found for resumeCVId: ${resumeCVId}`
                    );
                    throw new NotFoundException('Selected CV not found');
            }

            // Lấy nội dung CV từ selectedCV
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
            const totalApplicants = applications.length;

            // Kiểm tra hồ sơ có hợp lệ không (tùy chọn, nếu cần)
            const isProfileValid = !!cvContent; // Nếu có nội dung CV thì coi là hợp lệ
            if (!isProfileValid) {
                    throw new BadRequestException(
                            `Hey ${user.firstName} ${user.lastName}! CV của bạn không chứa thông tin hợp lệ để phân tích.`
                    );
            }

            const otherApplicantsInfo = applications
                    .filter((app) => app.user.userId !== userId)
                    .map((app, index) => ({
                            name: `${app.user.firstName} ${app.user.lastName}`,
                            skills: app.user.skills || 'Không có thông tin kỹ năng',
                            experienceLevel:
                                    app.user.experienceLevel ||
                                    'Không có thông tin kinh nghiệm',
                            education: app.user.education || 'Không có thông tin học vấn',
                            jobTitle:
                                    app.user.jobTitle || 'Không có thông tin vị trí mong muốn',
                    }));

            // Tách câu đầu ra khỏi introPrompt
            const introGreeting = `Chào bạn! Mình là AI của JobMarket, mình sẽ giúp ${user.firstName} ${user.lastName} so sánh mức độ cạnh tranh với các ứng viên khác cho công việc "${job.title}".`;
            const introContent = `
              Thông tin CV của ${user.firstName} ${user.lastName}:
              ${cvContent}
              
              Yêu cầu công việc:
              ${job.requirement}
              
              Thông tin các ứng viên khác (tổng cộng ${totalApplicants} người):
              ${otherApplicantsInfo
                      .map(
                              (applicant, index) => `Ứng viên ${index + 1}: ${applicant.name}
              - Kỹ năng: ${applicant.skills}
              - Kinh nghiệm: ${applicant.experienceLevel}
              - Học vấn: ${applicant.education}
              - Vị trí mong muốn: ${applicant.jobTitle}`
                      )
                      .join('\n\n')}
            `;

            const introPrompt = `${introGreeting}\n\n${introContent}`;

            const analysisPrompt = `
            Hãy phân tích và trả về kết quả theo cấu trúc sau, đảm bảo phản hồi chi tiết, ít nhất 700-800 ký tự:
            
            1. Đánh giá mức độ phù hợp của ${user.firstName} ${user.lastName}:  
            - Mức độ phù hợp với công việc: 70%, Huỳnh Nam có kiến thức cơ bản về Frontend (HTML, CSS, JavaScript, Vue.js, React.js, SCSS) và Backend (Node.js, RESTful API). Kinh nghiệm thực tế thông qua các dự án cá nhân và thực tập cho thấy khả năng áp dụng kiến thức vào thực tế. Tuy nhiên, kinh nghiệm còn hạn chế và chưa có dự án nào hoàn toàn sử dụng Vue.js (yêu cầu chính của công việc).  
            - So sánh với ứng viên đã ứng tuyển khác: Xếp hạng Huỳnh Nam ở vị trí thứ 2 trong 3 ứng viên. Mai Trúc Phan và Nguyễn Gia Huy chỉ cung cấp thông tin rất sơ lược về kỹ năng và kinh nghiệm, khó đánh giá chính xác năng lực. Huỳnh Nam nổi bật hơn nhờ cung cấp thông tin chi tiết về dự án và kỹ năng, mặc dù chưa hoàn toàn đáp ứng yêu cầu công việc.  
            - Mức lương thị trường đang trả: Ước lượng 7000 - 12000 USD/năm cho vị trí Fresher Frontend Engineer tại TP.HCM. Mức lương cụ thể phụ thuộc vào kỹ năng, kinh nghiệm thực tế và khả năng đàm phán. Thị trường Frontend Engineer tại Việt Nam đang phát triển mạnh mẽ, nhu cầu nhân lực cao dẫn đến mức lương cạnh tranh.  
            
            2. So sánh mức độ cạnh tranh:  
            - Có kinh nghiệm thực tế thông qua 2 dự án cá nhân (website bán cây cảnh và website đặt vé xem phim) và 1 thời gian thực tập tại DATVIETSOFTWARE  
            - Có nền tảng [Fresher] FRONTEND ENGINEER, đang là sinh viên chuyên ngành CNTT tại Hutech University và có kinh nghiệm thực tế với các dự án Frontend  
            - Có khả năng [Fresher] FRONTEND ENGINEER, đã thực hiện các dự án sử dụng HTML, CSS, JavaScript, React.js và Vue.js  
            - Thiếu thông tin về các kỹ năng mà [Fresher] FRONTEND ENGINEER cần, không có thông tin về kỹ năng mềm như giao tiếp, làm việc nhóm, và quy trình phát triển phần mềm (Agile, Scrum)  
            - Có kỹ năng tựa [Fresher] FRONTEND ENGINEER cần, có kinh nghiệm với React.js, Vue.js và REST API, phù hợp với một số yêu cầu của công việc  
            
            3. Học vấn:  
            - Có nền tảng [Fresher] FRONTEND ENGINEER, đang học chuyên ngành Công nghệ Thông tin tại Đại học HUTECH  
            - Không có chứng chỉ liên quan đến lập trình hoặc Frontend  
            
            4. Phân tích kinh nghiệm:  
            - Có nền tảng với lĩnh vực đang ứng tuyển, đã thực hiện các dự án liên quan đến Frontend và thực tập tại DATVIETSOFTWARE  
            - Không có chứng chỉ liên quan đến lập trình hoặc Frontend  
            - Có kỹ năng công nghệ nổi bật, có kinh nghiệm với React.js, Vue.js và REST API  
            
            5. Gợi ý cải thiện:  
            - Tập trung vào Vue.js: Nắm vững Vue.js và thực hiện thêm các dự án cá nhân sử dụng framework này  
            - Xây dựng Portfolio mạnh mẽ: Tạo một portfolio trực tuyến ấn tượng, thể hiện rõ các dự án đã làm, đặc biệt là những dự án sử dụng Vue.js  
            - Cải thiện kỹ năng giao tiếp: Nâng cao khả năng giao tiếp bằng tiếng Anh (ít nhất đạt trình độ B2 trở lên) và trình bày ý tưởng, kỹ năng một cách rõ ràng, mạch lạc  
            - Tham gia các cộng đồng lập trình: Tham gia các cộng đồng, nhóm lập trình để học hỏi kinh nghiệm và mở rộng network  
            - Làm thêm các dự án cá nhân: Thực hiện thêm các dự án cá nhân để tích lũy kinh nghiệm và chứng minh khả năng  
            
            6. Xếp hạng chung:  
            - Ứng viên chưa rõ thông tin (nếu có thêm thông tin chi tiết, có thể thay đổi): Thiếu thông tin cụ thể nên chưa thể đánh giá  
            - Huỳnh Nam: Có kinh nghiệm thực tế và kiến thức cơ bản tốt, nhưng cần cải thiện kỹ năng Vue.js và xây dựng portfolio  
            - Ứng viên chưa rõ thông tin (nếu có thêm thông tin chi tiết, có thể thay đổi): Thiếu thông tin cụ thể nên chưa thể đánh giá  
            
            Kết luận:  
            Huỳnh Nam có tiềm năng trở thành một Frontend Engineer. Tuy nhiên, để tăng khả năng cạnh tranh, anh cần tập trung vào việc nâng cao kỹ năng Vue.js, xây dựng một portfolio ấn tượng, và cải thiện khả năng giao tiếp. Chúc Huỳnh Nam thành công trong quá trình tìm việc  
          `;

            const prompt = `${introPrompt}\n\n---\n\n${analysisPrompt}`;
            console.log(
                    `[compareCompetitiveness] Prompt sent to AI: ${prompt.substring(0, 1000)}...`
            );

            try {
                    const model = this.genAI.getGenerativeModel({
                            model: 'gemini-1.5-flash-latest',
                            generationConfig: { maxOutputTokens: 1800 },
                    });
                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text();

                    console.log(`[compareCompetitiveness] Response from AI: ${responseText}`);

                    // Chỉ sử dụng introContent (không bao gồm introGreeting) trong finalResult
                    const finalResult = `${introContent}\n\n---\n\n${responseText}`;
                    console.log(
                            `[compareCompetitiveness] Final result to be returned: ${finalResult.substring(0, 1500)}...`
                    );

                    let order = await this.orderRepository.findOne({
                            where: { userId, jobId, resumeId: resumeCVId },
                    });
                    if (!order) {
                            order = this.orderRepository.create({
                                    userId,
                                    jobId,
                                    resumeId: resumeCVId,
                                    analyze_text: finalResult,
                            });
                    } else {
                            order.analyze_text = finalResult;
                    }

                    await this.orderRepository.save(order);
                    return finalResult;
            } catch (error) {
                    throw new BadRequestException(
                            'Có lỗi khi phân tích mức độ cạnh tranh. Vui lòng thử lại sau.'
                    );
            }
    }

    // Hàm parseCVContent và getStoredAnalysis không thay đổi
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

    async getStoredAnalysis(userId: number, jobId: number, resumeCVId: number): Promise<Order> {
            const order = await this.orderRepository.findOne({
                    where: { userId, jobId, resumeId: resumeCVId },
            });
            if (!order) {
                    throw new NotFoundException(
                            'No analysis found for this user, job, and resume'
                    );
            }
            return order;
    }
}
