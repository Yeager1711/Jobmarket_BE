import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Recruitment } from '../../../../entities/recruitment.entity';
import { LoginRecruitment_Dto } from '../dto/login.dto';

@Injectable()
export class AuthRecuitment_Service {
        constructor(
                @InjectRepository(Recruitment)
                private readonly recruitmentRepository: Repository<Recruitment>,
                private readonly jwtService: JwtService
        ) {}

        async validateUser(loginRecruitment_Dto: LoginRecruitment_Dto) {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { email_hr: loginRecruitment_Dto.email_hr },
                });

                if (!recruitment) {
                        throw new UnauthorizedException({
                                field: 'email_hr',
                                message: 'Email không tồn tại',
                        });
                }

                const isMatch = await bcrypt.compare(
                        loginRecruitment_Dto.password,
                        recruitment.password
                );
                if (!isMatch) {
                        throw new UnauthorizedException({
                                field: 'password',
                                message: 'Mật khẩu không chính xác',
                        });
                }

                const payload = {
                        recruitmentId: recruitment.recruitment_Id,
                        email_hr: recruitment.email_hr, // Sửa từ email thành email_hr
                };
                const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' });

                return { accessToken };
        }
}
