import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthUserService } from './login_user.service';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthUserController {
    constructor(private readonly authUserService: AuthUserService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        const { accessToken } = await this.authUserService.validateUser(loginDto);

        return {
            message: 'Đăng nhập thành công',
            accessToken,
        };
    }
}
