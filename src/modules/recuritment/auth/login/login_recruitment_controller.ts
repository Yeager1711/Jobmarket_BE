import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { AuthRecuitment_Service } from './login_recuitment.service';
import { LoginRecruitment_Dto } from '../dto/login.dto';
import { Response } from 'express';

@Controller('recruitment')
export class AuthUserController {
        constructor(private readonly recuitmentService: AuthRecuitment_Service) {}

        @Post('login')
        @HttpCode(HttpStatus.OK)
        async login(@Body() loginRecruitment_Dto: LoginRecruitment_Dto) {
                const { accessToken } =
                        await this.recuitmentService.validateUser(loginRecruitment_Dto);

                // Không đặt cookie, chỉ trả về accessToken trong phản hồi
                return {
                        message: 'Đăng nhập thành công',
                        accessToken,
                };
        }
}
