import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
        constructor(
                @InjectRepository(User)
                private userRepository: Repository<User>
        ) {}

        async register(registerDto: RegisterDto): Promise<User> {
                const {
                        email,
                        password,
                        firstName,
                        lastName,
                        phoneNumber,
                        address,
                        expectedSalary,
                        nationality,
                } = registerDto;

                // Kiểm tra email có đúng định dạng "@gmail.com"
                if (!email.endsWith('@gmail.com')) {
                        throw new BadRequestException('Email phải sử dụng tên miền @gmail.com');
                }

                // Kiểm tra số điện thoại có đúng định dạng quốc tế (bắt đầu bằng +, theo sau là mã quốc gia và số)
                const phoneRegex = /^\+\d{7,15}$/; // Chấp nhận số quốc tế từ 7-15 số sau mã quốc gia
                if (!phoneRegex.test(phoneNumber)) {
                        throw new BadRequestException(
                                'Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng quốc tế (VD: +84333409892)'
                        );
                }

                // Kiểm tra mật khẩu có ít nhất 1 chữ hoa, 1 ký tự đặc biệt và 1 số
                const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                if (!passwordRegex.test(password)) {
                        throw new BadRequestException(
                                'Mật khẩu phải có ít nhất 8 ký tự, bao gồm 1 chữ hoa, 1 số và 1 ký tự đặc biệt (@$!%*?&)'
                        );
                }

                const existingEmail = await this.userRepository.findOne({ where: { email } });
                const existingPhoneNumber = await this.userRepository.findOne({
                        where: { phoneNumber }, // So sánh với số đã lưu kèm mã quốc gia
                });

                if (existingEmail) {
                        throw new ConflictException('Email đã tồn tại');
                }
                if (existingPhoneNumber) {
                        throw new ConflictException('Số điện thoại đã tồn tại');
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                let randomUserId: number;
                let userExists: User | null;

                // Tạo userId khoảng 7 chữ số dựa vào thời gian + số random
                do {
                        const timestampPart = new Date().getTime().toString().slice(-5); // Lấy 5 số cuối từ timestamp
                        const randomPart = Math.floor(10 + Math.random() * 90); // Random 2 số từ 10 đến 99
                        randomUserId = Number(`${timestampPart}${randomPart}`); // Ghép lại thành số 7 chữ số

                        userExists = await this.userRepository.findOne({
                                where: { userId: randomUserId },
                        });
                } while (userExists);

                const newUser = this.userRepository.create({
                        userId: randomUserId,
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        phoneNumber, // Lưu số điện thoại kèm mã quốc gia
                        address,
                        expectedSalary,
                        nationality, // Lưu mã quốc gia (VD: 'VN') nếu có
                });

                await this.userRepository.save(newUser);
                return newUser;
        }
}
