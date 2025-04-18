import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Recruitment } from '../../../../entities/recruitment.entity';
import { Company } from '../../../../entities/company.entity';
import { CompanyIndustry } from '../../../../entities/company_industry.entity';
import { WorkLocation } from '../../../../entities/work_location.entity';
import { District } from '../../../../entities/district.entity';
import { User } from '../../../../entities/user.entity';
import { RegisterRecruitment_Dto } from '../dto/register.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
        constructor(
                @InjectRepository(Recruitment)
                private recruitmentRepository: Repository<Recruitment>,
                @InjectRepository(Company)
                private companyRepository: Repository<Company>,
                @InjectRepository(CompanyIndustry)
                private companyIndustryRepository: Repository<CompanyIndustry>,
                @InjectRepository(WorkLocation)
                private workLocationRepository: Repository<WorkLocation>,
                @InjectRepository(District)
                private districtRepository: Repository<District>,
                @InjectRepository(User)
                private userRepository: Repository<User>,
                private emailService: EmailService
        ) {}

        async register(registerDto: RegisterRecruitment_Dto): Promise<Recruitment> {
                const {
                        email_hr,
                        password,
                        companyName,
                        phoneNumber_company,
                        address,
                        industry,
                        firstName,
                        lastName,
                        company_description,
                } = registerDto;

                // Log dữ liệu nhận được
                console.log('Dữ liệu sẽ lưu:', {
                        email_hr,
                        companyName,
                        phoneNumber_company,
                        address,
                        industry,
                        firstName,
                        lastName,
                        company_description,
                });

                // Kiểm tra tất cả các trường không được bỏ trống
                if (!email_hr) {
                        throw new BadRequestException('Email không được để trống');
                }
                if (!password) {
                        throw new BadRequestException('Mật khẩu không được để trống');
                }
                if (!companyName) {
                        throw new BadRequestException('Tên công ty không được để trống');
                }
                if (!phoneNumber_company) {
                        throw new BadRequestException('Số điện thoại công ty không được để trống');
                }
                if (!address) {
                        throw new BadRequestException('Địa chỉ không được để trống');
                }
                if (!industry) {
                        throw new BadRequestException('Ngành nghề không được để trống');
                }
                if (!firstName) {
                        throw new BadRequestException('Họ không được để trống');
                }
                if (!lastName) {
                        throw new BadRequestException('Tên không được để trống');
                }
                if (!company_description) {
                        throw new BadRequestException('Mô tả công ty không được để trống');
                }

                // Kiểm tra định dạng mật khẩu
                const passwordRegex =
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                if (!passwordRegex.test(password)) {
                        throw new BadRequestException(
                                'Mật khẩu phải có ít nhất 8 ký tự, bao gồm 1 chữ cái in hoa, 1 chữ cái thường, 1 số và 1 ký tự đặc biệt (ví dụ: Matkhau@123)'
                        );
                }

                // Kiểm tra email có đúng định dạng "@gmail.com"
                if (!email_hr.endsWith('@gmail.com')) {
                        throw new BadRequestException('Email phải sử dụng tên miền @gmail.com');
                }

                // Kiểm tra email đã tồn tại trong bảng recruitment chưa
                const existingEmailInRecruitment = await this.recruitmentRepository.findOne({
                        where: { email_hr },
                });
                if (existingEmailInRecruitment) {
                        throw new ConflictException(
                                'Email đã tồn tại trong hệ thống nhà tuyển dụng'
                        );
                }

                // Kiểm tra email đã tồn tại trong bảng user chưa
                const existingEmailInUser = await this.userRepository.findOne({
                        where: { email: email_hr },
                });
                if (existingEmailInUser) {
                        throw new ConflictException('Email đang được đăng ký ở ứng viên tìm việc');
                }

                // Kiểm tra số điện thoại công ty đã tồn tại chưa
                const existingPhoneNumber = await this.companyRepository.findOneBy({
                        phoneNumber_company,
                });
                if (existingPhoneNumber) {
                        throw new ConflictException('Số điện thoại công ty đã tồn tại');
                }

                // Kiểm tra số điện thoại đã tồn tại trong bảng User chưa
                const existingPhoneNumberInUser = await this.userRepository.findOneBy({
                        phoneNumber: phoneNumber_company,
                });
                if (existingPhoneNumberInUser) {
                        throw new ConflictException(
                                'Số điện thoại đã được đăng ký ở ứng viên tìm việc'
                        );
                }

                // Kiểm tra định dạng số điện thoại
                const phoneRegex = /^[0-9]{10}$/;
                if (!phoneRegex.test(phoneNumber_company)) {
                        throw new BadRequestException('Số điện thoại không đúng định dạng');
                }

                // Kiểm tra tên công ty đã tồn tại chưa
                const existingCompanyName = await this.companyRepository.findOne({
                        where: { name: companyName },
                });
                if (existingCompanyName) {
                        throw new ConflictException('Tên công ty đã tồn tại trong hệ thống');
                }

                // Tạo transaction để đảm bảo tính toàn vẹn dữ liệu
                const queryRunner =
                        this.recruitmentRepository.manager.connection.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();

                try {
                        // Tạo companyId ngẫu nhiên
                        let companyId: number;
                        let companyExists: Company | null;
                        do {
                                const timestampPart = new Date().getTime().toString().slice(-5);
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                companyId = Number(`${timestampPart}${randomPart}`);
                                companyExists = await queryRunner.manager.findOne(Company, {
                                        where: { companyId },
                                });
                        } while (companyExists);

                        // Tạo recruitmentId ngẫu nhiên
                        let recruitmentId: number;
                        let recruitmentExists: Recruitment | null;
                        do {
                                const timestampPart = new Date().getTime().toString().slice(-5);
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                recruitmentId = Number(`${timestampPart}${randomPart}`);
                                recruitmentExists = await queryRunner.manager.findOne(Recruitment, {
                                        where: { recruitment_Id: recruitmentId },
                                });
                        } while (recruitmentExists);

                        // Tạo districtId ngẫu nhiên
                        let districtId: number;
                        let districtExists: District | null;
                        do {
                                const timestampPart = new Date().getTime().toString().slice(-5);
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                districtId = Number(`${timestampPart}${randomPart}`);
                                districtExists = await queryRunner.manager.findOne(District, {
                                        where: { districtId },
                                });
                        } while (districtExists);

                        // Tạo workLocationId ngẫu nhiên
                        let workLocationId: number;
                        let workLocationExists: WorkLocation | null;
                        do {
                                const timestampPart = new Date().getTime().toString().slice(-5);
                                const randomPart = Math.floor(10 + Math.random() * 90);
                                workLocationId = Number(`${timestampPart}${randomPart}`);
                                workLocationExists = await queryRunner.manager.findOne(
                                        WorkLocation,
                                        {
                                                where: { workLocationId },
                                        }
                                );
                        } while (workLocationExists);

                        // Tạo Company trước
                        const company = queryRunner.manager.create(Company, {
                                companyId,
                                name: companyName,
                                phoneNumber_company,
                                company_description,
                                created_at: new Date(),
                                updated_at: new Date(),
                        });
                        await queryRunner.manager.save(company);
                        console.log('Đã lưu Company:', JSON.stringify(company, null, 2));

                        // Luôn tạo CompanyIndustry mới với companyIndustry_ID = companyId
                        const companyIndustry = queryRunner.manager.create(CompanyIndustry, {
                                companyIndustry_ID: companyId,
                                name: industry,
                                company: { companyId },
                        });
                        await queryRunner.manager.save(companyIndustry);
                        console.log(
                                'Đã lưu CompanyIndustry:',
                                JSON.stringify(companyIndustry, null, 2)
                        );

                        // Xử lý địa chỉ
                        const addressParts = address.split(',').map((part: string) => part.trim());
                        let districtProvinceName: string;

                        // Kiểm tra địa chỉ có đủ chi tiết không
                        if (addressParts.length >= 3) {
                                // Lấy hai phần cuối làm quận/huyện và tỉnh/thành phố
                                districtProvinceName = addressParts.slice(-2).join(', ');
                        } else {
                                throw new BadRequestException(
                                        'Địa chỉ phải bao gồm địa chỉ cụ thể, quận/huyện và tỉnh/thành phố (ví dụ: Tòa nhà 11, Đoàn Văn Bơ, Phường 12, Thành phố Thủ Đức, Thành phố Hồ Chí Minh)'
                                );
                        }

                        // Tạo District
                        let district = await queryRunner.manager.findOne(District, {
                                where: { name: districtProvinceName },
                        });
                        if (!district) {
                                district = queryRunner.manager.create(District, {
                                        districtId,
                                        name: districtProvinceName,
                                });
                                await queryRunner.manager.save(district);
                                console.log('Đã lưu District:', JSON.stringify(district, null, 2));
                        } else {
                                console.log(
                                        'District đã tồn tại:',
                                        JSON.stringify(district, null, 2)
                                );
                        }

                        // Mã hóa mật khẩu và tạo Recruitment sau
                        const hashedPassword = await bcrypt.hash(password, 10);
                        const recruitment = queryRunner.manager.create(Recruitment, {
                                recruitment_Id: recruitmentId,
                                companyId: company.companyId,
                                email_hr,
                                password: hashedPassword,
                                firstName,
                                lastName,
                        });
                        await queryRunner.manager.save(recruitment);
                        console.log('Đã lưu Recruitment:', JSON.stringify(recruitment, null, 2));

                        // Cập nhật lại company với recruitment
                        company.recruitment = recruitment.recruitment_Id;
                        await queryRunner.manager.save(company);
                        console.log(
                                'Đã cập nhật Company với recruitment:',
                                JSON.stringify(company, null, 2)
                        );

                        // Tạo WorkLocation với quan hệ company và district
                        const workLocation = queryRunner.manager.create(WorkLocation, {
                                workLocationId,
                                company,
                                address_name: address,
                                district,
                                created_at: new Date(),
                                updated_at: new Date(),
                        });
                        console.log(
                                'Dữ liệu WorkLocation trước khi lưu:',
                                JSON.stringify(workLocation, null, 2)
                        );
                        await queryRunner.manager.save(workLocation);
                        // Tải lại WorkLocation để xác nhận giá trị đã lưu
                        const savedWorkLocation = await queryRunner.manager.findOne(WorkLocation, {
                                where: { workLocationId },
                                relations: ['company', 'district'],
                        });
                        console.log(
                                'Đã lưu WorkLocation:',
                                JSON.stringify(savedWorkLocation, null, 2)
                        );

                        // Gửi email xác nhận đã đăng ký thành công
                        await this.emailService.sendRegistrationEmail(
                                email_hr,
                                firstName,
                                lastName,
                                companyName
                        );

                        await queryRunner.commitTransaction();
                        return recruitment;
                } catch (error) {
                        await queryRunner.rollbackTransaction();
                        console.error('Lỗi khi lưu dữ liệu:', error);
                        throw error;
                } finally {
                        await queryRunner.release();
                }
        }
}
