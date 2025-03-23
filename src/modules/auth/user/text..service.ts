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
        const apiKeyGenimi = process.env.GEMINI_API_KEY || 'AIzaSyAVmDicVH0w6erDKRaszQSIj-NYAznmDnE';
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
        const hasResumeCV = (await this.resumeRepository.count({ where: { user: { userId } } })) > 0;

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
            throw new BadRequestException(`Tài khoản của bạn đã đủ 2 CV.\n    Vui lòng xóa để cập nhật mới!`);
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
                throw new ConflictException('Số điện thoại đã được sử dụng bởi người dùng khác');
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
    async updateEmail(userId: number, newEmail: string, currentPassword: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        // Kiểm tra xem tài khoản có mật khẩu không
        if (!user.password) {
            throw new BadRequestException('Người dùng này không có mật khẩu, không thể thay đổi email');
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
    async changePassword(userId: number, newPassword: string, currentPassword: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { userId } });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        if (!user.password) {
            throw new BadRequestException('Người dùng này không có mật khẩu mới, không thể thay đổi mật khẩu');
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
            throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại');
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
                const filePath = path.join(__dirname, '..', '..', '..', resume.CV_img);
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
            console.log('[GoogleGenerativeAI] Available models:', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[GoogleGenerativeAI] Error listing models:', error.message);
        }
    }

    // Hàm mới để phân tích mức độ cạnh tranh
    async analyzeCompetitiveness(userId: number, jobId: number, resumeCVId: number): Promise<string> {
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

    async compareCompetitiveness(userId: number, jobId: number, resumeCVId: number): Promise<string> {
        console.log(
            `[compareCompetitiveness] Starting for userId: ${userId}, jobId: ${jobId}, resumeCVId: ${resumeCVId}`
        );

        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            console.log(`[compareCompetitiveness] User not found for userId: ${userId}`);
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
            console.log(`[compareCompetitiveness] CV not found for resumeCVId: ${resumeCVId}`);
            throw new NotFoundException('Selected CV not found');
        }

        const cvContent = await this.parseCVContent(selectedCV.CV_img);
        if (!cvContent) {
            console.log(`[compareCompetitiveness] No content extracted from CV for resumeCVId: ${resumeCVId}`);
            throw new BadRequestException('Không thể trích xuất nội dung từ CV đã chọn');
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
                experienceLevel: app.user.experienceLevel || 'Không có thông tin kinh nghiệm',
                education: app.user.education || 'Không có thông tin học vấn',
                jobTitle: app.user.jobTitle || 'Không có thông tin vị trí mong muốn',
            }));

        const introGreeting = `*Chào bạn! Mình là AI của JobMarket, mình sẽ giúp ${user.firstName} ${user.lastName} so sánh mức độ cạnh tranh với các ứng viên khác cho công việc "${job.title}".`;

        // Loại bỏ cvContent khỏi introContent để không lưu vào database
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

        // Thêm cvContent vào analysisPrompt để AI vẫn có thể phân tích, nhưng không lưu vào database
        const analysisPrompt = `
            Hãy phân tích mức độ cạnh tranh của ứng viên dựa trên thông tin CV, yêu cầu công việc và dữ liệu từ các ứng viên khác đã ứng tuyển. Trả lời bằng tiếng Việt, sử dụng giọng điệu thân thiện, chuyên nghiệp và chi tiết. Đảm bảo phản hồi có độ dài tối thiểu 2000 ký tự để cung cấp phân tích sâu sắc, không bỏ sót bất kỳ khía cạnh nào. Dưới đây là thông tin chi tiết để phân tích:
            
            ---
            
            ### Thông tin đầu vào
            1. **Thông tin CV của ứng viên**:
            - Họ tên: ${user.firstName} ${user.lastName}
            - Nội dung CV: ${cvContent}
            - Kỹ năng công nghệ: HTML, CSS, JavaScript, React.js, Vue.js, REST API.
            - Dự án cá nhân:
                    - Website bán cây cảnh: Phát triển giao diện người dùng bằng React.js, tích hợp REST API để hiển thị sản phẩm, tối ưu hóa tốc độ tải trang.
                    - Website đặt vé xem phim: Sử dụng Vue.js, thiết kế responsive, tích hợp thanh toán qua API bên thứ ba.
            - Kinh nghiệm thực tế:
                    - Thực tập tại DATVIETSOFTWARE (3 tháng): Hỗ trợ phát triển giao diện Frontend, làm việc với React.js và REST API, tham gia nhóm 5 người.
            - Học vấn: Sinh viên năm 4, chuyên ngành Công nghệ Thông tin, Đại học HUTECH.
            - Kỹ năng mềm: Không có thông tin cụ thể về giao tiếp, làm việc nhóm, hoặc quy trình phát triển phần mềm (Agile, Scrum).
            - Chứng chỉ: Không có chứng chỉ liên quan đến lập trình hoặc Frontend.
            
            2. **Yêu cầu công việc**:
            - Tiêu đề: ${job.title}
            - Kỹ năng bắt buộc: HTML, CSS, JavaScript, React.js hoặc Vue.js, hiểu biết cơ bản về REST API.
            - Kỹ năng ưu tiên: Kinh nghiệm với quy trình Agile/Scrum, làm việc nhóm, giao tiếp tốt với team backend.
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
            Hãy phân tích và trả về kết quả theo cấu trúc cố định dưới đây. Đảm bảo mỗi phần được giải thích chi tiết, đưa ra số liệu cụ thể (phần trăm, xếp hạng, mức lương), và cung cấp lý do rõ ràng dựa trên dữ liệu đầu vào. Tránh lặp lại thông tin giữa các phần, thay vào đó bổ sung các góc nhìn mới để làm rõ mức độ cạnh tranh của ứng viên.
            
            ---
            
            ## 1. Đánh giá mức độ phù hợp của ${user.firstName} ${user.lastName}
            - **Mức độ phù hợp với công việc**: [X%]  
            [Giải thích chi tiết: So sánh kỹ năng, kinh nghiệm, học vấn với yêu cầu công việc.]  
            - **So sánh với ứng viên khác**: [Xếp hạng X/${totalApplicants}]  
            [Giải thích: So sánh kỹ năng, kinh nghiệm, học vấn với các ứng viên khác.]  
            - **Mức lương thị trường**: [$X - $Y/năm]  
            [Phân tích: Ước lượng dựa trên ngành nghề, kinh nghiệm, và kỹ năng.]  
            
            ## 2. So sánh mức độ cạnh tranh
            - **Điểm mạnh kỹ thuật**:  
            [Liệt kê và phân tích kỹ năng công nghệ, dự án cá nhân, kinh nghiệm thực tập.]  
            - **Điểm yếu kỹ thuật**:  
            [Phân tích các kỹ năng còn thiếu hoặc yếu so với yêu cầu công việc.]  
            - **Điểm mạnh kinh nghiệm**:  
            [Đánh giá kinh nghiệm thực tế qua dự án và thực tập.]  
            - **Điểm yếu kinh nghiệm**:  
            [So sánh thời gian và chất lượng kinh nghiệm với ứng viên khác.]  
            - **Điểm mạnh kỹ năng mềm**:  
            [Nếu có thông tin, phân tích khả năng giao tiếp, làm việc nhóm.]  
            - **Điểm yếu kỹ năng mềm**:  
            [Phân tích sự thiếu hụt kỹ năng mềm và tác động đến công việc.]  
            
            ## 3. Học vấn
            - **Nền tảng học vấn**:  
            [So sánh với yêu cầu công việc và ứng viên khác.]  
            - **Chứng chỉ và khóa học**:  
            [Phân tích sự thiếu hụt hoặc lợi thế từ chứng chỉ.]  
            - **Tiềm năng phát triển**:  
            [Dự đoán khả năng học hỏi dựa trên học vấn hiện tại.]  
            
            ## 4. Phân tích kinh nghiệm
            - **Kinh nghiệm thực tế**:  
            [Phân tích chi tiết dự án cá nhân và thực tập, mức độ liên quan đến công việc.]  
            - **So sánh với yêu cầu**:  
            [Đánh giá kinh nghiệm có đáp ứng yêu cầu 0-1 năm không.]  
            - **So sánh với ứng viên khác**:  
            [Xếp hạng kinh nghiệm thực tế so với các ứng viên khác.]  
            
            ## 5. Gợi ý cải thiện
            1. [Gợi ý 1 - Giải thích ngắn gọn lý do và lợi ích.]  
            2. [Gợi ý 2 - Giải thích ngắn gọn lý do và lợi ích.]  
            3. [Gợi ý 3 - Giải thích ngắn gọn lý do và lợi ích.]  
            4. [Gợi ý 4 - Giải thích ngắn gọn lý do và lợi ích.]  
            5. [Gợi ý 5 - Giải thích ngắn gọn lý do và lợi ích.]  
            6. [Gợi ý 6 - Giải thích ngắn gọn lý do và lợi ích.]  
            7. [Gợi ý 7 - Giải thích ngắn gọn lý do và lợi ích.]  
            
            ## 6. Xếp hạng chung
            - **Danh sách xếp hạng**:  
            1. [Tên ứng viên 1 - Lý do ngắn gọn.]  
            2. [Tên ứng viên 2 - Lý do ngắn gọn.]  
            ...  
            [Xếp hạng của ${user.firstName} ${user.lastName} - Lý do ngắn gọn.]  
            
            ## 7. Kết luận
            - **[Đưa ra Lời khuyên chi tiết hướng đi cụ thể để cải thiện cơ hội trúng tuyển.]**  
            - **[Đưa ra Lời chúc Động viên ứng viên với giọng điệu tích cực.]** :
            
            ---
            
            ### Hướng dẫn bổ sung
            - Sử dụng dữ liệu từ "Thông tin CV của ứng viên", "Yêu cầu công việc", và "Thông tin các ứng viên khác" để đưa ra phân tích chính xác.
            - Đảm bảo giọng điệu thân thiện, giống như một người cố vấn đang trò chuyện với ứng viên.
            - Tính toán phần trăm và xếp hạng dựa trên sự so sánh hợp lý, giải thích rõ cách tính.
            - Không trả lời chung chung, phải cá nhân hóa dựa trên thông tin của ${user.firstName} ${user.lastName}.
            - **Đặc biệt: Bọc các từ khóa quan trọng trong thẻ <key>. Các từ khóa quan trọng bao gồm:**
            - Tên công ty (ví dụ: DATVIETSOFTWARE).
            - Tên trường học (ví dụ: Đại học HUTECH, Hutech University, Ho Chi Minh of Universiry).
            - Tech tag (ví dụ: HTML, CSS, JavaScript, React.js, Vue.js, REST API, Agile/Scrum).
            - Tên dự án (ví dụ: Website bán cây cảnh, Website đặt vé xem phim).
            - Kỹ năng mềm (ví dụ: giao tiếp, làm việc nhóm, giải quyết vấn đề, quản lý thời gian).
            Ví dụ: "Kinh nghiệm thực tập tại <key>DATVIETSOFTWARE</key> và học tại <key>Đại học HUTECH</key> là lợi thế."
        `;

        const prompt = `${introPrompt}\n\n---\n\n${analysisPrompt}`;
        console.log(`[compareCompetitiveness] Prompt sent to AI: ${prompt.substring(0, 1000)}...`);

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash-latest',
                generationConfig: { maxOutputTokens: 2000 }, // Tăng để đảm bảo phản hồi dài
            });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            console.log(`[compareCompetitiveness] Response from AI: ${responseText}`);

            // Không lưu cvContent vào finalResult
            const finalResult = `${introGreeting}\n\n${introContent}\n\n---\n\n${responseText}`;
            console.log(`[compareCompetitiveness] Final result to be returned: ${finalResult.substring(0, 1500)}...`);

            return finalResult;
        } catch (error) {
            throw new BadRequestException('Có lỗi khi phân tích mức độ cạnh tranh. Vui lòng thử lại sau.');
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

            const cleanedText = data.text.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim();
            console.log(`[parseCVContent] Cleaned Text: \n${cleanedText}`);

            return cleanedText;
        } catch (error) {
            console.error(`[parseCVContent] Error parsing CV: ${error.message}`);
            throw new BadRequestException('Có lỗi khi phân tích CV. Vui lòng kiểm tra file và thử lại.');
        }
    }
}