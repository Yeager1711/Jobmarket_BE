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

    // Hàm mới để phân tích mức độ cạnh tranh
    async analyzeCompetitiveness(
            userId: number,
            jobId: number,
            resumeCVId: number
    ): Promise<string> {
            console.log(
                    `[analyzeCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
            );

            // 1. Kiểm tra xem dữ liệu phân tích đã tồn tại trong DB chưa
            let order = await this.orderRepository.findOne({
                    where: { userId, jobId, resumeId: resumeCVId },
            });

            if (order && order.analyze_text) {
                    console.log(
                            `[analyzeCompetitiveness] Found existing analysis in DB for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
                    );
                    return order.analyze_text; // Trả về dữ liệu đã có trong DB
            }

            // 2. Nếu không có dữ liệu, gọi hàm compareCompetitiveness để tạo mới
            console.log(
                    `[analyzeCompetitiveness] No existing analysis found, generating new analysis for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
            );
            const analysisResult = await this.compareCompetitiveness(userId, jobId, resumeCVId);

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

            await this.orderRepository.save(order);
            console.log(
                    `[analyzeCompetitiveness] Saved new analysis to DB for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
            );

            return analysisResult;
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
            const totalApplicants = applications.length;

            const isProfileValid = !!cvContent;
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

            const introGreeting = `**Chào bạn! Mình là AI của JobMarket, mình sẽ giúp ${user.firstName} ${user.lastName} so sánh mức độ cạnh tranh với các ứng viên khác cho công việc "${job.title}".`;

            const introContent = `
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
            - Tiêu đề: ${job.title}
            - Kỹ năng bắt buộc: <key>HTML</key>, <key>CSS</key>, <key>JavaScript</key>, <key>React.js</key> hoặc <key>Vue.js</key>, hiểu biết cơ bản về <key>REST API</key>.
            - Kỹ năng ưu tiên: Kinh nghiệm với quy trình <key>Agile/Scrum</key>, <key>làm việc nhóm</key>, <key>giao tiếp</key> tốt với team backend.
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
                    - Học vấn: ${applicant.education}
                    - Kỹ năng mềm: Không có thông tin cụ thể trừ khi được đề cập trong kinh nghiệm hoặc học vấn.
            `
                    )
                    .join('\n')}
            
            ---
            
            ### Yêu cầu phân tích
            Hãy phân tích và trả về kết quả theo cấu trúc cố định dưới đây. Đảm bảo mỗi phần được giải thích chi tiết, đưa ra số liệu phần trăm (%) cụ thể cho các mục chính: "Mức độ phù hợp với công việc", "Điểm mạnh kỹ thuật", "Kinh nghiệm thực tế", và "Học vấn". Các con số phần trăm phải được phân tích kỹ lưỡng dựa trên dữ liệu CV, yêu cầu công việc, và so sánh với các ứng viên khác, thể hiện tính rõ ràng và bám sát mức độ cạnh tranh. "Mức độ phù hợp với công việc" được tính bằng trung bình cộng của 7 mục: "Điểm mạnh kỹ thuật", "Điểm mạnh kinh nghiệm", "Điểm mạnh kỹ năng mềm", "Học vấn", "Kinh nghiệm thực tế", "So sánh với yêu cầu", và "So sánh với ứng viên khác". Không sử dụng dấu [] trong phần giải thích, giữ nguyên các thẻ <key> cho từ khóa quan trọng, và cung cấp lý do ngắn gọn dựa trên dữ liệu.
            
            ---
            
            ## 1. Đánh giá mức độ phù hợp của ${user.firstName} ${user.lastName}
            - **Mức độ phù hợp với công việc**: X%  
            Giải thích chi tiết: Trung bình cộng của <key>Điểm mạnh kỹ thuật</key>, <key>Điểm mạnh kinh nghiệm</key>, <key>Điểm mạnh kỹ năng mềm</key>, <key>Học vấn</key>, <key>Kinh nghiệm thực tế</key>, <key>So sánh với yêu cầu</key>, và <key>So sánh với ứng viên khác</key>, phản ánh khả năng tổng thể đáp ứng công việc dựa trên CV và yêu cầu.  
            - **So sánh với ứng viên khác**: Xếp hạng X/${totalApplicants}  
            Giải thích: So sánh tổng thể với các ứng viên khác dựa trên kỹ năng và kinh nghiệm thực tế.  
            - **Mức lương thị trường**: $X - $Y/năm  
            Phân tích: Ước lượng dựa trên kinh nghiệm tại <key>DATVIETSOFTWARE</key>, dự án cá nhân, và mức lương ngành.  
            
            ## 2. So sánh mức độ cạnh tranh
            - **Điểm mạnh kỹ thuật**: X%  
            Phân tích: Đánh giá mức độ thành thạo <key>HTML</key>, <key>CSS</key>, <key>JavaScript</key>, <key>React.js</key>, <key>Vue.js</key>, <key>REST API</key> so với yêu cầu công việc và các ứng viên khác.  
            - **Điểm yếu kỹ thuật**:  
            Phân tích các kỹ năng còn thiếu như <key>Agile/Scrum</key> so với yêu cầu công việc.  
            - **Điểm mạnh kinh nghiệm**: X%  
            Phân tích: Đánh giá kinh nghiệm thực tế tại <key>DATVIETSOFTWARE</key> và dự án <key>Website bán cây cảnh</key>, <key>Website đặt vé xem phim</key> so với yêu cầu.  
            - **Điểm yếu kinh nghiệm**:  
            Phân tích thời gian kinh nghiệm và mức độ liên quan so với yêu cầu tối đa 1 năm.  
            - **Điểm mạnh kỹ năng mềm**: X%  
            Phân tích khả năng <key>giao tiếp</key>, <key>làm việc nhóm</key> dựa trên thông tin CV và yêu cầu công việc.  
            - **Điểm yếu kỹ năng mềm**:  
            Phân tích sự thiếu hụt thông tin về <key>kỹ năng mềm</key> so với yêu cầu.  
            
            ## 3. Học vấn
            - **Học vấn**: X%  
            Phân tích: Đánh giá nền tảng học vấn tại <key>Đại học HUTECH</key> và sự phù hợp với yêu cầu công việc, so sánh với các ứng viên khác.  
            - **Chứng chỉ và khóa học**:  
            Phân tích sự thiếu hụt chứng chỉ liên quan đến lập trình so với yêu cầu.  
            - **Tiềm năng phát triển**:  
            Dự đoán khả năng học hỏi dựa trên học vấn và dự án cá nhân.  
            
            ## 4. Phân tích kinh nghiệm
            - **Kinh nghiệm thực tế**: X%  
            Phân tích: Đánh giá thực tập tại <key>DATVIETSOFTWARE</key> và dự án <key>Website bán cây cảnh</key>, <key>Website đặt vé xem phim</key> so với yêu cầu công việc.  
            - **So sánh với yêu cầu**: X%  
            Phân tích: Đánh giá kinh nghiệm thực tế so với yêu cầu 0-1 năm và các kỹ năng ưu tiên.  
            - **So sánh với ứng viên khác**: X%  
            Phân tích: So sánh kinh nghiệm thực tế với các ứng viên khác dựa trên mức độ liên quan và thời gian.  
            
            ## 5. Gợi ý cải thiện
            1. Bổ sung <key>kỹ năng mềm</key> vào CV - Tăng khả năng <key>giao tiếp</key> và <key>làm việc nhóm</key>.  
            2. Học <key>Agile/Scrum</key> - Đáp ứng yêu cầu kỹ thuật đầy đủ hơn.  
            3. Chi tiết hóa dự án cá nhân - Thể hiện rõ năng lực trong CV.  
            4. Làm thêm dự án freelance - Tích lũy thêm kinh nghiệm thực tế.  
            5. Tạo portfolio online - Showcase kỹ năng để gây ấn tượng.  
            6. Chuẩn bị kỹ lưỡng cho phỏng vấn - Tăng cơ hội thể hiện bản thân.  
            7. Lấy chứng chỉ <key>React.js</key> hoặc <key>Vue.js</key> - Nâng cao học vấn và uy tín.  
            
            ## 6. Xếp hạng chung
            - **Danh sách xếp hạng**:  
            1. ${user.firstName} ${user.lastName} - Kỹ năng lập trình tốt, kinh nghiệm thực tế.  
            2. [Tên ứng viên 2] - Thiếu kỹ năng lập trình cụ thể.  
            ...  
            
            ## 7. Kết luận
            - **Lời khuyên chi tiết**: Hãy tập trung bổ sung <key>kỹ năng mềm</key> và học <key>Agile/Scrum</key> để tăng cơ hội trúng tuyển.  
            - **Lời chúc động viên**: Chúc bạn sớm đạt được công việc mơ ước với sự nỗ lực của mình!  
            
            ---
            
            ### Hướng dẫn bổ sung
            - Giữ nguyên các thẻ <key> cho từ khóa quan trọng như <key>HTML</key>, <key>DATVIETSOFTWARE</key>, <key>Đại học HUTECH</key>.
            - Tất cả phần trăm phải được phân tích cụ thể dựa trên dữ liệu CV, yêu cầu công việc, và so sánh với ứng viên khác, không đưa ra số liệu chung chung.
            - "Mức độ phù hợp với công việc" là trung bình cộng của 7 mục: "Điểm mạnh kỹ thuật", "Điểm mạnh kinh nghiệm", "Điểm mạnh kỹ năng mềm", "Học vấn", "Kinh nghiệm thực tế", "So sánh với yêu cầu", "So sánh với ứng viên khác".
            - Giọng điệu thân thiện, như một người cố vấn.
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
                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text();

                    console.log(`[compareCompetitiveness] Response from AI: ${responseText}`);

                    const finalResult = `${introGreeting}\n\n${introContent}\n\n---\n\n${responseText}`;
                    console.log(
                            `[compareCompetitiveness] Final result to be returned: ${finalResult.substring(0, 1500)}...`
                    );

                    return finalResult;
            } catch (error) {
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
}
